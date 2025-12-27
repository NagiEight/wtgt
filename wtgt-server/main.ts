"use strict";

import fs from "fs/promises";
import path from "path";
import http from "http";
import util from "util";

import * as ws from "ws";

import { existsSync } from "fs";

import validateMessage from "./helpers/validateMessage.js";
import getCurrentTime from "./helpers/getCurrentTime.js";
import generatePassword from "./helpers/generatePassword.js";

import * as sendMessageTypes from "./types/client-to-server.js";
import * as adminSendMessageTypes from "./types/admin-to-server.js";
import * as receiveMessageTypes from "./types/server-to-client.js";
import * as adminReceiveMessageTypes from "./types/server-to-admin.js";

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

// fake ass decorator
Server.registerProtocol("host")
((UserID: string, ContentJSON: sendMessageTypes.host): void => {
    if(!validateMessage(ContentJSON, { type: "test", content: { MediaName: "test", RoomType: "test", IsPaused: true }})) 
        return Server.sendError(UserID, `Invalid message format for ${ContentJSON.type}.`);

    const isInRoom: boolean = Server.members[UserID].In !== "";
    if(isInRoom) 
        return Server.sendError(UserID, `Member ${UserID} is already belong to a room.`);

    const allowedRoomTypes: string[] = [
        "private",
        "public"
    ];

    const RoomType: string = ContentJSON.content.RoomType;

    if(!allowedRoomTypes.includes(RoomType))
        return Server.sendError(UserID, `Unknown room type: ${RoomType}.`);

    const RoomID: string = Server.generateUniqueUUID((UUID: string) => Boolean(Server.rooms[UUID])),
        MediaName: string = ContentJSON.content.MediaName,
        IsPaused: boolean = ContentJSON.content.IsPaused;

    Server.members[UserID].In = RoomID;
    Server.rooms[RoomID] = {
        CurrentMedia: MediaName,
        IsPaused,
        Host: UserID,
        Type: RoomType as "private" | "public",
        Mods: [],
        Members: [UserID],
        Messages: {}
    }

    Server.getSession(UserID).send(JSON.stringify({
        type: "info",
        content: {
            RoomID
        }
    }));

    Server.broadcastToAdmins({ 
        type: "userHost", 
        content: {
            RoomID,
            MediaName,
            IsPaused,
            Host: UserID
        } 
    });
});

Server.registerProtocol("join")
((UserID: string, ContentJSON: sendMessageTypes.join): void => {
    if(!validateMessage(ContentJSON, { type: "test", content: { RoomID: "" } })) 
        return Server.sendError(UserID, `Invalid message format for ${ContentJSON.type}.`);

    const RoomID: string = ContentJSON.content.RoomID;

    if(!Server.rooms[RoomID])
        return Server.sendError(UserID, `Unknown room ${RoomID}.`);

    const isInRoom: boolean = Server.members[UserID].In !== "";

    if(isInRoom) 
        return Server.sendError(UserID, `Member ${UserID} is already belong to a room.`);

    Server.rooms[RoomID].Members.push(UserID);
    Server.members[UserID].In = RoomID;

    const currentRoom = Server.rooms[RoomID],
        membersObj: { [MemberID: string]: { Username: string, Avt: string } } = {};

    for(const memberID of currentRoom.Members) {
        membersObj[memberID] = {
            Username: Server.members[memberID].UserName,
            Avt: Server.members[memberID].Avt
        };
    }

    const toSend: { [Props: string]: any } = {
        CurrentMedia: currentRoom.CurrentMedia,
        IsPaused: currentRoom.IsPaused,
        Mods: currentRoom.Mods,
        Members: membersObj,
        Messages: currentRoom.Messages
    };

    if(Server.rooms[RoomID].Type === "private") 
        toSend.RoomID = RoomID;

    Server.getSession(UserID).send(JSON.stringify({ type: "init", content: toSend }));

    Server.broadcastToRoom(RoomID, { 
        type: "join", 
        content: {
            UserID,
            UserName: Server.members[UserID].UserName,
            Avt: Server.members[UserID].Avt
        } 
    }, UserID);

    Server.broadcastToAdmins({ 
        type: "userJoin", 
        content: {
            UserID,
            Target: RoomID
        } 
    });
    Server.print(`${UserID} joined a room.`, RoomID);
});

Server.registerProtocol("leave")
((UserID: string, ContentJSON: sendMessageTypes.leave): void => {
    if(!validateMessage(ContentJSON, { type: "" }))
        return Server.sendError(UserID, `Invalid message format for ${ContentJSON.type}.`);

    const RoomID: string = Server.members[UserID].In;
    if(!RoomID) 
        return Server.sendError(UserID, `Member ${UserID} does not belong to a room.`);

    if(UserID === Server.rooms[RoomID].Host) {
        Server.broadcastToRoom(RoomID, { type: "end", content: undefined });

        for(const MemberID of Server.rooms[RoomID].Members)
            Server.members[MemberID].In = "";

        delete Server.rooms[RoomID];
        Server.broadcastToAdmins({ type: "roomEnd", content: { RoomID } });
        Server.print(`${UserID} ended their room session.`, RoomID);
        return;
    }
    
    const roomMember: string[] = Server.rooms[RoomID].Members;
    roomMember.splice(roomMember.indexOf(UserID), 1);
    Server.broadcastToRoom(RoomID, { type: "leave", content: { MemberID: UserID } });
    Server.members[UserID].In = "";
    Server.broadcastToAdmins({
        type: "memberLeave",
        content: {
            RoomID,
            UserID
        }
    });
    Server.print(`${UserID} left.`, RoomID);
});

Server.registerProtocol("message")
((UserID: string, ContentJSON: sendMessageTypes.message): void => {
    if(!validateMessage(ContentJSON, { type: "test", content: { Text: "test" } })) 
        return Server.sendError(UserID, `Invalid message format for ${ContentJSON.type}.`);

    const RoomID: string = Server.members[UserID].In;
    if(!Server.members[UserID].In) 
        return Server.sendError(UserID, `Member ${UserID} does not belong to a room.`);

    const MessageID: string = Server.generateUniqueUUID((UUID: string): boolean => !Server.rooms[RoomID].Messages[UUID]),
        Text: string = ContentJSON.content.Text,
        MessageObject = {
            Sender: UserID,
            Text,
            Timestamp: getCurrentTime()
        };

    Server.rooms[RoomID].Messages[MessageID] = MessageObject;

    Server.broadcastToRoom(RoomID, { 
        type: "message", 
        content: {
            MessageID,
            ...MessageObject
        } 
    });

    Server.print(`${UserID}: ${Text}`, RoomID);
});

Server.registerProtocol("election")
((UserID: string, ContentJSON: sendMessageTypes.election): void => {
    if(!validateMessage(ContentJSON, { type: "test", content: { Target: "test" } }))
        return Server.sendError(UserID, `Invalid message format for ${ContentJSON.type}.`);

    const RoomID: string = Server.members[UserID].In;
    if(!RoomID) 
        return Server.sendError(UserID, `Member ${UserID} does not belong to a room.`);
    
    const Target: string = ContentJSON.content.Target,
    isMemberBelongToRoom = Server.rooms[RoomID].Members.includes(Target),
    isMemberAMod = Server.rooms[RoomID].Mods.includes(Target),
    doesMemberHasPermission = Server.rooms[RoomID].Host == UserID,
    isEligibleForElection = isMemberBelongToRoom && !isMemberAMod && doesMemberHasPermission;

    if(isEligibleForElection) {
        Server.rooms[RoomID].Mods.push(Target);

        Server.broadcastToRoom(RoomID, ContentJSON);

        Server.broadcastToAdmins({ 
            type: "userElection", 
            content: {
                RoomID,
                Target
            }
        });
        Server.print(`${Target} elected to moderator by the host.`, RoomID);
    }
    else if(!doesMemberHasPermission) 
        Server.sendError(UserID, "Insufficient permission.");
    else if(isMemberAMod)
        Server.sendError(UserID, `Member ${Target} is already a moderator.`);
    else Server.sendError(UserID, `Unknown member ${Target}: Member does not exist or does not belong to this room.`);
});

Server.registerProtocol("demotion")
((UserID: string, ContentJSON: sendMessageTypes.demotion): void => {
    if(!validateMessage(ContentJSON, { type: "test", content: { Target: "test" } })) 
        return Server.sendError(UserID, `Invalid message format for ${ContentJSON.type}.`);
    
    const RoomID: string = Server.members[UserID].In;

    if(!RoomID) 
        return Server.sendError(UserID, `Member ${UserID} does not belong to a room.`);
        
    const Target: string = ContentJSON.content.Target,
    isMemberBelongToRoom: boolean = Server.rooms[RoomID].Members.includes(Target),
    isMemberAMod: boolean = Server.rooms[RoomID].Mods.includes(Target),
    doesMemberHasPermission: boolean = Server.rooms[RoomID].Host == UserID,
    isEligibleForDemotion: boolean = isMemberBelongToRoom && isMemberAMod && doesMemberHasPermission;

    if(isEligibleForDemotion) {
        Server.rooms[RoomID].Mods.splice(Server.rooms[RoomID].Mods.indexOf(Target), 1);

        Server.broadcastToRoom(RoomID, { type: "demotion", content: { Target } });

        Server.broadcastToAdmins({ 
            type: "userDemotion", 
            content: {
                RoomID,
                Target
            } 
        });

        Server.print(`${Target} has their moderator privilege revoked by the host.`, RoomID);
    }
    else if(!doesMemberHasPermission) 
        Server.sendError(UserID, "Insufficient permission.");
    else if(!isMemberAMod)
        Server.sendError(UserID, `Member ${Target} is not a moderator.`);
    else Server.sendError(UserID, `Unknown member ${Target}: Member does not exist or does not belong to this room.`);
});

Server.registerProtocol("pause")
((UserID: string, ContentJSON: sendMessageTypes.pause): void => {
    if(!validateMessage(ContentJSON, { type: "test", content: { IsPaused: false } }))
        return Server.sendError(UserID, `Invalid message format for ${ContentJSON.type}.`);

    const RoomID: string = Server.members[UserID].In;
    if(!RoomID)
        return Server.sendError(UserID, "Not currently in a room.");

    if(UserID !== Server.rooms[RoomID].Host && Server.rooms[RoomID].Type === "public") 
        return Server.sendError(UserID, "Insufficient permission.");

    Server.rooms[RoomID].IsPaused = ContentJSON.content.IsPaused;
    Server.broadcastToRoom(RoomID, ContentJSON);
    Server.print(`${UserID} paused.`, RoomID);
});

Server.registerProtocol("sync")
((UserID: string, ContentJSON: sendMessageTypes.sync): void => {
    if(!validateMessage(ContentJSON, { type: "test", content: { Timestamp: 1234 } }))
        return Server.sendError(UserID, `Invalid message format for ${ContentJSON.type}.`);

    const RoomID: string = Server.members[UserID].In;
    if(!RoomID)
        return Server.sendError(UserID, `Member ${UserID} does not belong to a room.`);

    if(UserID !== Server.rooms[RoomID].Host && Server.rooms[RoomID].Type === "public") 
        return Server.sendError(UserID, "Insufficient permission.");

    Server.broadcastToRoom(RoomID, ContentJSON);
    Server.print(`${UserID} skipped to ${ContentJSON.content.Timestamp}`, RoomID);
});

Server.registerProtocol("upload")
((UserID: string, ContentJSON: sendMessageTypes.upload): void => {
    
});

Server.registerProtocol("query")
((UserID: string, ContentJSON: sendMessageTypes.query) => {
    if(!validateMessage(ContentJSON, { type: "test" })) 
        return Server.sendError(UserID, `Invalid message format for ${ContentJSON.type}.`);

    Server.getSession(UserID).send(JSON.stringify({
        type: "queryResult",
        content: Object.fromEntries(Object.keys(Server.rooms).filter((RoomID: string): boolean => Server.rooms[RoomID].Type === "public").map((RoomID: string) => [RoomID, Server.rooms[RoomID]]))
    }));
});

Server.registerProtocol("adminLogin")
((AdminID: string, ContentJSON: adminSendMessageTypes.adminLogin): void => {
    if(!validateMessage(ContentJSON, { type: "test", content: { Password: "string" } })) 
        return Server.sendError(AdminID, `Invalid message format for ${ContentJSON.type}.`);

    if(Server.members[AdminID].IsAuthorized) 
        return Server.sendError(AdminID, "Already logged in as an admin.");

    if(Server.members[AdminID].AdminLoginAttempts > Server.config.MaxAdminLoginAttempts) 
        return Server.sendError(AdminID, "Exceeded the login attempt count, cannot continue.");

    if(ContentJSON.content.Password !== Server.config.PanelPassword) {
        Server.members[AdminID].AdminLoginAttempts += 1;
        return Server.sendError(AdminID, "Incorrect admin password, please try again.");
    }
    
    Server.members[AdminID].AdminLoginAttempts = 0;
    Server.members[AdminID].IsAuthorized = true;
    Server.adminLookUp.push(AdminID);
    const membersObj: { [MemberID: string]: { UserName: string, Avt: string } } = {};

    for(const memberID in Server.members) {
        membersObj[memberID] = {
            UserName: Server.members[memberID].UserName,
            Avt: Server.members[memberID].Avt
        };
    }

    Server.getSession(AdminID).send(JSON.stringify({
        type: "adminInit", 
        content: {
            Logs: Server.logs.join("\n"),
            Rooms: Server.rooms,
            Members: membersObj
        }
    }));
});

Server.registerProtocol("adminLogout")
((AdminID: string, ContentJSON: adminSendMessageTypes.adminLogout): void => {
    if(!validateMessage(ContentJSON, { type: "adminLogout" })) 
        return Server.sendError(AdminID, `Invalid message format for ${ContentJSON.type}.`);

    if(!Server.members[AdminID].IsAuthorized) 
        return Server.sendError(AdminID, "Not logged in as an admin.");

    Server.members[AdminID].IsAuthorized = false;
    Server.adminLookUp.splice(Server.adminLookUp.indexOf(AdminID), 1);
});

Server.registerProtocol("shutdown")
((AdminID: string, ContentJSON: adminSendMessageTypes.shutdown): void => {
    if(!validateMessage(ContentJSON, { type: "shutdown" }))
        return Server.sendError(AdminID, `Invalid message format for ${ContentJSON.type}.`);

    if(!Server.members[AdminID].IsAuthorized) 
        return Server.sendError(AdminID, "Insufficient permission.");

    Server.close();
});
    
process.on("SIGTERM", Server.close);
process.on("SIGINT", Server.close);
process.on("SIGHUP", Server.close);
process.on("uncaughtException", Server.close);
process.on("unhandledRejection", Server.close);

await (async () => {
    await Server.initializeConfig();
    
    Server.server.listen(Server.config.PORT, () => {
        Server.print(`Hello World! Server's running at port ${Server.config.PORT}.`);
        if(Server.config.RegeneratePassword) {
            setInterval(async () => {
                Server.config.PanelPassword = generatePassword(Server.config.AdminPasswordLength, Server.config.PanelPassword);
                await fs.writeFile(path.join("./server-properties", "config.json"), JSON.stringify(Server.config, null, 4), { encoding: "utf-8" });
                Server.print(`Password resetted. Current Admin panel password is: ${Server.config.PanelPassword}`);
            }, Server.hoursToMs(Server.config.PasswordRegenerationIntervalHours));
        }
        if(Server.config.ServerTerminalFlushing) {
            setInterval(async () => {
                await Server.writeLog();
                console.clear();
                Server.print(`Current Admin panel password is: ${Server.config.PanelPassword}`);
            }, Server.hoursToMs(Server.config.FlushingIntervalHours));
        }
    });
})();