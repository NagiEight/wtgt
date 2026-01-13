import http from "http";
import path from "path";
import fs from "fs/promises";
import util from "util";

import * as ws from "ws";

import { existsSync } from "fs";
import { ChildProcessWithoutNullStreams, spawn } from "child_process";

import getCurrentTime from "../helpers/getCurrentTime.js";

import * as db from "./dbManager.js";

export interface Room {
    CurrentMedia: string;
    Host: string;
    Limit: number;
    Type: "private" | "public";
    IsPaused: boolean;
    Mods: string[];
    Members: string[];
    Queue: string[];
    Messages: {
        [MessageID: string]: {
            Sender: string;
            Text: string;
            Timestamp: string;
        };
    };
}

interface RoomsObj {
    [RoomID: string]: Room;
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
    BucketCapacity: number;
    BucketRefillIntervalHours: number;
    RoomLimit: number;
    FlushingIntervalHours: number;
    ServerTerminalFlushing: boolean;
}

interface Bucket {
    [IP: string]: {
        Tokens: number;
        LastRefill: number;
    };
}

interface Message {
    type: string;
    content?: {
        [Props: string]: string | boolean | number | string[] | boolean[] | number[]
    }
}

type Router = (urlParts: string[], url: URL) => Promise<string | null>;

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
            }
        ;
        fullUrl.pathname = (fullUrl.pathname + "/").replace(/\/+/g, "/");
        const urlParts: string[] = decodeURI(fullUrl.pathname)
            .split("/")
            .filter((value: string): boolean => !(value.length > 0 && /^[.]+$/.test(value)))
            .map((part: string): string => part.replace(/ /g, "_"))
        ;
        
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
        UserID = generateUniqueUUID((UUID: string): boolean => Boolean(members[UUID]));
        print(`New connection from: ${UserID}.`);

        members[UserID] = {
            UserName: userProfile.UserName,
            Avt: userProfile.Avt,
            In: "",
            AdminLoginAttempts: 0,
            IsAuthorized: false,
            Socket: client
        };

        client.on("close", (): void => {
            if(members[UserID].IsAuthorized)
                adminLookUp.splice(adminLookUp.indexOf(UserID), 1);

            if(members[UserID].In) {
                const RoomID: string = members[UserID].In;
                const Room = rooms[RoomID];
                if(rooms[members[UserID].In].Host === UserID) {
                    broadcastToRoom(RoomID, { type: "end" });
                    delete rooms[RoomID];
                }
                else {
                    broadcastToRoom(RoomID, { type: "disconnect", content: { MemberID: UserID } });
                    Room.Members.splice(Room.Members.indexOf(UserID));
                }
            }

            print(`${UserID} disconnected.`);
            delete members[UserID];
        });

        client.on("message", async (data: ws.RawData, isBinary: boolean): Promise<void> => {
            /*
            if(!members[UserID].IsAuthorized) {
                const addresses: string[] = getIPs(req);

                for(const address of addresses) {
                    if(!allowRequest(address)) {
                        sendError(UserID, "Rate limit exceeded.");
                        return;
                    }
                }
            }/** */

            if(isBinary) {
                const RoomID: string = members[UserID].In;
                const Room: Room = rooms[RoomID];
                if(!Room) 
                    return sendError(UserID, "You do not belong to a room.");

                if(Room.Host !== UserID) 
                    return sendError(UserID, "Only the host can broadcast media.");

                return broadcastToRoom(RoomID, data, [UserID], true);
            }

            let ContentJSON: Message;
            try {
                ContentJSON = JSON.parse(data.toString());
            }
            catch(err) {
                return sendError(UserID, "Invalid JSON message sent, try again.");
            }

            const protocol = protocolRegistry[ContentJSON.type];
            if(!protocol)
                return sendError(UserID, `Unknown message type: ${ContentJSON.type}.`);
           await protocol(UserID, ContentJSON);
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
            try {
                let AdminProfile = await db.query(url.searchParams.get("u"));
                if(url.searchParams.get("p") !== AdminProfile.Profile.Password || !AdminProfile.Approved) {
                    return "403";
                }
            }
            catch {
                return "403";
            }
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
        BucketCapacity: 2500,
        BucketRefillIntervalHours: 1,
        RoomLimit: 20,
        FlushingIntervalHours: 12,
        ServerTerminalFlushing: true
    }
;

let monitorableTerm_: ChildProcessWithoutNullStreams = spawn("node", ["./helpers/echo.js"], { stdio: ["pipe", "pipe", "pipe"] });

export const logs: string[] = [],
    print = (object: any, RoomID?: string, SendLog?: boolean): void => {
        let toPrint = object;

        if(typeof toPrint !== "string")
            toPrint = util.inspect(object);

        monitorableTerm_.stdin.write(`${util.styleText("yellowBright", `[${getCurrentTime()}]`)}${RoomID ? `${util.styleText("greenBright", `{${RoomID}}`)}` : ""} ${toPrint}`);        
        logs.push(`[${getCurrentTime()}]${RoomID ? `{${RoomID}}` : ""} ${toPrint}`);

        if(SendLog) {
            broadcastToAdmins({ type: "log", content: { Entry: toPrint } });
        }
    },
    hoursToMs = (time: number): number => time * 3600000,
    allowRequest = (IP: string): boolean => {
        const refillRate: number = config.BucketCapacity / hoursToMs(config.BucketRefillIntervalHours);

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
    registerProtocol = <T extends Message>(messageName: string) => (target: (UserID: string, ContentJSON: T) => Promise<void>): void => 
        (protocolRegistry[messageName] = target) as unknown as void,
    /**
     * Stop the server and write log.
     */
    close = (): void => {
        for(const UserID in members) {
            const client: ws.WebSocket = members[UserID].Socket;
            client.send(JSON.stringify({ type: "serverEnd" }));
            try {
                client.terminate();
            }
            catch {}
        }

        server.close(writeLog);
        process.exit(0);
    }, 
    /**
     * Broadcast Content to room of RoomID.
     */
    broadcastToRoom = (RoomID: string, Content: Message | ws.RawData, Except: string[] = [], Binary?: boolean): void => {
        if(!rooms[RoomID])
            return;

        for(const UserID of rooms[RoomID].Members) {
            const member: MembersObj[keyof MembersObj] = members[UserID],
                session: ws.WebSocket = getSession(UserID)
            ;

            let toSend: string | ws.RawData;
            if(Binary)
                toSend = Content as ws.RawData;
            else toSend = JSON.stringify(Content);

            if(member && session && session.readyState === ws.WebSocket.OPEN && !Except.includes(UserID)) {
                session.send(toSend);
            }
        }
    },
    /**
     * Write server's log to a file and empty the log array.
     */
    writeLog = async (): Promise<void> => { 
        if(logs.length === 0)
            return;
        await fs.writeFile(path.join("logs", `${generateUniqueUUID((UUID: string): boolean => existsSync(path.join("logs", `${UUID}.log`)))}.log`), logs.join("\n"), { encoding: "utf-8" });
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
    broadcastToAdmins = (ContentJSON: Message): void => adminLookUp.forEach((AdminID: string): void => members[AdminID].Socket.send(JSON.stringify(ContentJSON))),     
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
    config: Config = await (async (): Promise<Config> => {
        const propertiesPath: string = "./server-properties";
        await fs.mkdir(propertiesPath, { recursive: true });
        await fs.mkdir("./logs", { recursive: true });
        const configPath: string = path.join(propertiesPath, "config.json");

        let Output: Config;

        try {
            const raw: Config = JSON.parse(await fs.readFile(configPath, "utf-8"));
            Output = sanitizeConfig(raw, defaultConfig);
        }
        catch(err) {
            print(`Error reading config: ${err instanceof Error ? err.message : err}`, undefined, false);
            Output = structuredClone(defaultConfig);
        }

        await fs.writeFile(configPath, JSON.stringify(Output, null, 4), { encoding: "utf-8" });
        return Output;
    })(),
    protocolRegistry: { [MessageName: string]: (UserID: string, ContentJSON: Message) => Promise<void> } = {},
    rooms: RoomsObj = {},
    members: MembersObj = {},
    adminLookUp: string[] = [],
    server: http.Server<typeof http.IncomingMessage, typeof http.ServerResponse> = http.createServer(serverInternals),
    wss: ws.WebSocketServer = new ws.WebSocketServer({ server })
;

wss.on("connection", wssInternals);
wss.on("error", (err): void => {
    close();
    print(err.message, undefined, false);
});
server.on("error", (err): void => {
    close();
    print(err.message, undefined, false);
});