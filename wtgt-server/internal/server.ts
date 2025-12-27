import http from "http";
import path from "path";
import fs from "fs/promises";
import util from "util";

import * as ws from "ws";

import { existsSync } from "fs";

import getCurrentTime from "../helpers/getCurrentTime.js";
import generatePassword from "../helpers/generatePassword.js";

import * as sendMessageTypes from "../types/client-to-server.js";
import * as adminSendMessageTypes from "../types/admin-to-server.js";
import * as receiveMessageTypes from "../types/server-to-client.js";
import * as adminReceiveMessageTypes from "../types/server-to-admin.js";

interface RoomsObj {
    [RoomID: string]: {
        CurrentMedia: string;
        Host: string;
        Type: "private" | "public";
        IsPaused: boolean;
        Mods: string[];
        Members: string[];
        Messages: {
            [MessageID: string]: {
                Sender: string;
                Text: string;
                Timestamp: string;
            };
        };
    };
}

interface MembersObj {
    [memberID: string]: {
        UserName: string;
        In: string;
        Avt: string;
        AdminLoginAttempts: number;
        IsAuthorized: boolean;
        Socket: ws.WebSocket;
    };
}

interface Config {
    AdminPasswordLength: number;
    MaxAdminLoginAttempts: number;
    PORT: number;
    PanelPassword: string;
    RegeneratePassword: boolean;
    PasswordRegenerationIntervalHours: number;
    ServerTerminalFlushing: boolean;
    FlushingIntervalHours: number;
    BucketCapacity: number;
    BucketRefillIntervalHours: number;
}

interface Bucket {
    [IP: string]: {
        Tokens: number;
        LastRefill: number;
    }
}

type Router = (urlParts: string[], url: URL) => Promise<string | null>;

type ContentJSONType = 
    | sendMessageTypes.host 
    | sendMessageTypes.join 
    | sendMessageTypes.leave 
    | sendMessageTypes.message 
    | sendMessageTypes.election 
    | sendMessageTypes.demotion 
    | sendMessageTypes.pause 
    | sendMessageTypes.sync 
    | sendMessageTypes.upload 
    | sendMessageTypes.query 
    | adminSendMessageTypes.adminLogin 
    | adminSendMessageTypes.adminLogout 
    | adminSendMessageTypes.shutdown;

type SendMessageTypes = 
    | receiveMessageTypes.info 
    | receiveMessageTypes.init 
    | receiveMessageTypes.join 
    | receiveMessageTypes.message 
    | receiveMessageTypes.election 
    | receiveMessageTypes.demotion 
    | receiveMessageTypes.leave 
    | receiveMessageTypes.end 
    | receiveMessageTypes.pause 
    | receiveMessageTypes.sync 
    | receiveMessageTypes.upload
    ;

type AdminSendMessageTypes = 
    | adminReceiveMessageTypes.adminInit 
    | adminReceiveMessageTypes.log 
    | adminReceiveMessageTypes.userHost 
    | adminReceiveMessageTypes.userJoin 
    | adminReceiveMessageTypes.userElection 
    | adminReceiveMessageTypes.userDemotion 
    | adminReceiveMessageTypes.memberLeave 
    | adminReceiveMessageTypes.roomEnd 
    | adminReceiveMessageTypes.connection;

export namespace Server {
    export let config: Config;
    
    const getIPs = (req: http.IncomingMessage): string[] => [...(
            Array.isArray(req.headers["x-forwarded-for"]) ? 
            req.headers["x-forwarded-for"] : 
            (req.headers["x-forwarded-for"] as string || "").replace(/ /g, "").split(",")
        ),
        req.socket.remoteAddress
    ].filter(Boolean),
    serverInternals = async (req: http.IncomingMessage, res: http.ServerResponse): Promise<void> => {
        const addresses: string[] = getIPs(req);
        for(const address of addresses) {
            if(!allowRequest(address)) {
                res.writeHead(429, { "content-type": "text/plain" });
                res.end("429 Too Many Requests: Rate limit exceeded.");
                return;
            }
        }

        if(req.method.toUpperCase() !== "GET") {
            res.writeHead(501, { "content-type": "text/plain" });
            res.end("501 Not Implemented.");
            return;
        }
        /**
         * / -> public/index.html
         * /file.ext/ -> public/file.ext
         * 
         * /watch/ -> public/watch/watch.html
         * /watch/file.ext/ -> public/watch/file.ext
         * 
         * /admin/ -> admin/login.html
         * /admin/file.ext/ -> admin/file.ext
         * 
         * /admin/panel/ -> admin/panel/panel.html
         * /admin/panel/file.ext/ -> admin/panel/file.ext
         */
        const fullUrl: URL = new URL("https://temp.com" + req.url),
            staticExtensions: { [Ext: string]: string } = {
                ".js": "application/javascript",
                ".png": "image/png",
                ".jpg": "image/jpeg",
                ".svg": "image/svg+xml",
                ".css": "text/css",
                ".html": "text/html"
            };
        fullUrl.pathname = (fullUrl.pathname + "/").replace(/\/+/g, "/");
        const urlParts: string[] = decodeURI(fullUrl.pathname)
            .split("/")
            .filter((value: string): boolean => !(value.length > 0 && /^[.]+$/.test(value)))
            .map((part: string): string => part.replace(/ /g, "_"));
        
        let filePath: string | null = null;

        for(const Router of Routers) {
            const result: string | null = await Router(urlParts, fullUrl);
            if(!result) 
                continue;
            if(result === "403") {
                res.writeHead(403, { "content-type": "text/plain" });
                res.end("403 Forbidden: Accessing admin features requires the server's panel password attached as query parameter.");
                return;
            }
            filePath = result;
            break;
        }
        
        print(filePath);
        print(urlParts);
        res.writeHead(200, { "content-type": "text/plain" });
        res.end(filePath);
        return;
        
        if(filePath && existsSync(filePath)) {
            const ext: string = path.extname(filePath);
            res.writeHead(200, { "content-type": staticExtensions[ext] });
            res.end(await fs.readFile(filePath));
        }
        else {
            res.writeHead(404, { "content-type": "text/plain" });
            res.end(`404 Not Found: Cannot resolve ${fullUrl.pathname}, try again.`);
        }
    },
    wssInternals = (client: ws.WebSocket, req: http.IncomingMessage): void => {
        const url: URL = new URL(req.url, `ws://${req.headers.host}`),
        userProfile = {
            UserName: url.searchParams.get("UserName"),
            Avt: url.searchParams.get("Avt")
        },
        UserID = generateUniqueUUID((UUID: string): boolean => !members[UUID]);
    
        members[UserID] = {
            UserName: userProfile.UserName,
            Avt: userProfile.Avt,
            In: "",
            AdminLoginAttempts: 0,
            IsAuthorized: false,
            Socket: client
        };
    
        client.on("close", () => {
            if(members[UserID].IsAuthorized)
                adminLookUp.splice(adminLookUp.indexOf(UserID), 1);
            print(`${UserID} disconnected.`);
            delete members[UserID];
        });
    
        client.on("message", (data: ws.RawData): void => {
            if(!members[UserID].IsAuthorized) {
                const addresses: string[] = getIPs(req);
    
                for(const address of addresses) {
                    if(!allowRequest(address)) {
                        sendError(UserID, "Rate limit exceeded.");
                        return;
                    }
                }
            }
    
            let ContentJSON: ContentJSONType;
            try {
                ContentJSON = JSON.parse(data.toString());
            }
            catch(err) {
                return sendError(UserID, "Invalid JSON message sent, try again.");
            }
    
            const protocol = protocolRegistry[ContentJSON.type];
            if(!protocol)
                return sendError(UserID, `Unknown message type: ${ContentJSON.type}.`);
            protocol(UserID, ContentJSON);
        });
    },
    sanitizeConfig = <T>(input: unknown, template: T): T => {
        if(typeof template !== "object" || template === null) 
            return (typeof input === typeof template ? input : template) as T;

        if(typeof input !== "object" || input === null) 
            return structuredClone(template);
        
        const result: any = Array.isArray(template) ? [] : {};
        for(const key in template) {
            const templateValue = (template as any)[key],
            inputValue = (input as any)[key];

            result[key] = sanitizeConfig(inputValue, templateValue);
        }
        return result;    
    },
    buckets: Bucket = {},
    Routers: Router[] = [
        async (parts: string[], url: URL): Promise<string | null> => {
            if(parts[1] !== "admin" || parts[2] !== "panel")
                return null;
            if(url.searchParams.get("p") !== config.PanelPassword)
                return "403";
            if(parts.length === 4)
                return path.join("admin", "panel", "panel.html");
            if(parts.length === 5)
                return path.join("admin", "panel", path.basename(url.pathname));
            return null;
        },
        async (parts: string[], url: URL): Promise<string | null> => parts[1] === "admin" && parts.length === 4 && path.join("admin", path.basename(url.pathname)),
        async (parts: string[]): Promise<string | null> => parts[1] === "admin" && parts.length === 3 && path.join("admin", "login.html"),
        async (parts: string[], url: URL): Promise<string | null> => parts[1] === "watch" && parts.length === 4 && path.join("public", "watch", path.basename(url.pathname)),
        async (parts: string[]): Promise<string | null> => parts[1] === "watch" && parts.length === 3 && path.join("public", "watch", "watch.html"),
        async (parts: string[], url: URL): Promise<string | null> => parts.length === 3 && path.join("public", path.basename(url.pathname)),
        async (parts: string[]): Promise<string | null> => parts.length === 2 && path.join("public", "index.html")
    ],
    defaultConfig: Config = {
        AdminPasswordLength: 16,
        MaxAdminLoginAttempts: 5,
        PORT: 3000,
        PanelPassword: "",
        RegeneratePassword: true,
        PasswordRegenerationIntervalHours: 12,
        ServerTerminalFlushing: true,
        FlushingIntervalHours: 12,
        BucketCapacity: 2500,
        BucketRefillIntervalHours: 1
    };

    export const print = (object: any, RoomID?: string): void => {
        let toPrint = object;
        if(typeof toPrint !== "string")
            toPrint = util.inspect(object);
        console.log(`${util.styleText("yellowBright", `[${getCurrentTime()}]`)}${RoomID ? `${util.styleText("greenBright", `{${RoomID}}`)}` : ""} ${toPrint}`);
        logs.push(`[${getCurrentTime()}]${RoomID ? `{${RoomID}}` : ""} ${toPrint}`);
    },
    hoursToMs = (time: number): number => time * 3600000,
    allowRequest = (IP: string): boolean => {
        const refillRate = config.BucketCapacity / hoursToMs(config.BucketRefillIntervalHours);

        const now: number = Date.now();
        let bucket = buckets[IP];
        if(!bucket) {
            bucket = { Tokens: config.BucketCapacity, LastRefill: now };
            buckets[IP] = bucket;
        }

        const elapsed: number = now - bucket.LastRefill;
        bucket.Tokens = Math.min(config.BucketCapacity, bucket.Tokens + elapsed * refillRate);
        bucket.LastRefill = now;

        if(bucket.Tokens < 1)
            return false;

        bucket.Tokens -= 1;
        return true;
    }, 
    registerProtocol = <T extends ContentJSONType>(messageName: string) => (target: (UserID: string, ContentJSON: T) => void): void => 
        (protocolRegistry[messageName] = target) as unknown as void,
    initializeConfig = async (): Promise<void> => {
        const propertiesPath: string = "./server-properties";
        await fs.mkdir(propertiesPath, { recursive: true });
        const configPath: string = path.join(propertiesPath, "config.json");

        let Output: Config;

        try {
            const raw: Config = JSON.parse(await fs.readFile(configPath, "utf-8"));
            Output = sanitizeConfig(raw, defaultConfig);
        }
        catch(err) {
            print(`Error reading config: ${err instanceof Error ? err.message : err}`);
            Output = structuredClone(defaultConfig);
        }

        if(Output.PanelPassword === "") {
            Output.PanelPassword = generatePassword(Output.AdminPasswordLength);
        }

        await fs.writeFile(configPath, JSON.stringify(Output, null, 4), { encoding: "utf-8" });
        config = Output;
    },
    /**
     * Stop the server and write log.
     */
    close = (): void => {
        wss.clients.forEach((client: ws.WebSocket): void => {
            try {
                client.close();
            }
            catch {
                client.terminate();
            }
        });

        server.close(writeLog);
        process.exit(0);
    }, 
    /**
     * Broadcast ContentJSON to room of RoomID.
     */
    broadcastToRoom = (RoomID: string, ContentJSON: SendMessageTypes, ...except: string[]): void => {
        if(!rooms[RoomID])
            return;

        for(const UserID of rooms[RoomID].Members) {
            const member: MembersObj[""] = members[UserID],
            session: ws.WebSocket = getSession(UserID);
            if(member && session && session.readyState === ws.WebSocket.OPEN && !except.includes(UserID)) {
                session.send(JSON.stringify(ContentJSON));
            }
        }
    },
    /**
     * Write server's log to a file and empty the log array.
     */
    writeLog = async (): Promise<void> => { 
        await fs.writeFile(path.join("logs", generateUniqueUUID((UUID: string): boolean => existsSync(path.join("logs", `${UUID}.log`)))), logs.join("\n"), { encoding: "utf-8" });
        logs.length = 0;
    },
    /**
     * Send an error message to UserID.
     */
    sendError = (UserID: string, Message: string): void => getSession(UserID).send(JSON.stringify({
        type: "error",
        content: { Message }
    })), 
    /**
     * Get the websocket connection belongs to UserID.
     */
    getSession = (UserID: string): ws.WebSocket => members[UserID].Socket,
    /**
     * Broacast ContentJSON to all active admin clients.
     */
    broadcastToAdmins = (ContentJSON: AdminSendMessageTypes): void => adminLookUp.forEach((AdminID: string): void => members[AdminID].Socket.send(JSON.stringify(ContentJSON))),     
    /**
     * Generate a unique UUID base on the prerequisite function, regenerate if prerequisite returns true.
     */
    generateUniqueUUID = (prerequisite: (UUID: string) => boolean): string => {
        let UUID: string;

        do {
            UUID = crypto.randomUUID();
        } while(prerequisite(UUID));

        return UUID;
    },
    protocolRegistry: { [MessageName: string]: (UserID: string, ContentJSON: ContentJSONType) => void } = {},
    rooms: RoomsObj = {},
    members: MembersObj = {},
    logs: string[] = [],
    adminLookUp: string[] = [],
    server: http.Server<typeof http.IncomingMessage, typeof http.ServerResponse> = http.createServer(serverInternals),
    wss: ws.WebSocketServer = new ws.WebSocketServer({ server });

    wss.on("connection", wssInternals);
    server.on("error", Server.close);
}