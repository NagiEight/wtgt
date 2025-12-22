import https from "https";
import http from "http";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import util from "util";
import os from "os";
import child_process from "child_process";

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
        currentMedia: string;
        host: string;
        type: "private" | "public";
        isPaused: boolean;
        mods: string[];
        members: string[];
        messages: {
            [messageID: string]: {
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
    | receiveMessageTypes.upload;

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

const print = (object: any, RoomID?: string): void => {
        let toPrint = object;
        if(typeof toPrint === "object")
            toPrint = util.inspect(toPrint);
        console.log(`${util.styleText("yellowBright", `[${getCurrentTime()}]`)}${RoomID ? `${util.styleText("greenBright", `{${RoomID}}`)}` : ""} ${toPrint}`);
        logs.push(`[${getCurrentTime()}]${RoomID ? `{${RoomID}}` : ""} ${object}`);
    },
    clear = (): void => {
        if(os.platform() === "win32")
            child_process.spawn("cls", { stdio: "inherit", shell: true });
        else child_process.spawn("clear", { stdio: "inherit", shell: true });
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
    getIPs = (req: http.IncomingMessage): string[] => [...(
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
    registerProtocol = <T extends ContentJSONType>(messageName: string) => (target: (UserID: string, ContentJSON: T) => void): void => 
        (protocolRegistry[messageName] = target) as unknown as void,
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
    buckets: Bucket = {},
    protocolRegistry: { [MessageName: string]: (UserID: string, ContentJSON: ContentJSONType) => void } = {},
    server: http.Server<typeof http.IncomingMessage, typeof http.ServerResponse> = http.createServer(serverInternals),
    wss: ws.WebSocketServer = new ws.WebSocketServer({ server }),
    rooms: RoomsObj = {},
    members: MembersObj = {},
    adminIDs: string[] = [],
    logs: string[] = [],
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
    },
    config: Config = await (async (): Promise<Config> => {
        const propertiesPath: string = "./server-properties";
        await fs.mkdir(propertiesPath, { recursive: true });
        const configPath: string = path.join(propertiesPath, "config.json");

        let Output: Config;

        try {
            Output = JSON.parse(await fs.readFile(configPath, "utf-8"));

            if(!validateMessage(config, defaultConfig)) 
                Output = defaultConfig;
        }
        catch(err) {
            if(err instanceof Error)
                print(`Error reading config: ${err.message}`);
            else print(`Error reading config: ${err}`);
            Output = defaultConfig;
        }

        if(Output.PanelPassword === "") {
            Output.PanelPassword = generatePassword(Output.AdminPasswordLength);
        }

        await fs.writeFile(configPath, JSON.stringify(Output, null, 4), { encoding: "utf-8" });
        return Output;
    })();

wss.on("connection", (client: ws.WebSocket, req: http.IncomingMessage): void => {
    const url: URL = new URL(req.url, `ws://${req.headers.host}`),
        userProfile = {
            UserName: url.searchParams.get("UserName"),
            Avt: url.searchParams.get("Avt")
        },
        UserID = generateUniqueUUID((UUID: string): boolean => !Boolean(members[UUID]));

    members[UserID] = {
        UserName: userProfile.UserName,
        Avt: userProfile.Avt,
        In: "",
        AdminLoginAttempts: 0,
        Socket: client
    };

    client.on("close", () => {
        if(adminIDs.includes(UserID)) 
            adminIDs.splice(adminIDs.indexOf(UserID), 1);
        print(`${UserID} disconnected.`);
        delete members[UserID];
    });

    client.on("message", (data: ws.RawData): void => {
        if(!adminIDs.includes(UserID)) {
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

        const type: ContentJSONType["type"] = ContentJSON.type;
        const protocol = protocolRegistry[type];
        if(!protocol)
            return sendError(UserID, `Unknown message type: ${type}.`);
        protocol(UserID, ContentJSON);
    });
});

registerProtocol("host")((UserID: string, ContentJSON: sendMessageTypes.host): void => {
    if(!validateMessage(ContentJSON, { type: "test", content: { MediaName: "test", RoomType: "test", IsPaused: true }})) 
        return sendError(UserID, `Invalid message format for ${ContentJSON.type}.`);

    const isInRoom: boolean = members[UserID].In !== "";
    if(isInRoom) 
        return sendError(UserID, `Member ${UserID} is already belong to a room.`);

    const allowedRoomTypes: string[] = [
        "private",
        "public"
    ];

    const RoomType: string = ContentJSON.content.RoomType;

    if(!allowedRoomTypes.includes(RoomType))
        return sendError(UserID, `Unknown room type: ${RoomType}.`);

    const RoomID: string = generateUniqueUUID((UUID: string) => !Boolean(rooms[UUID]));

    members[UserID].In = RoomID;
    rooms[RoomID] = {
        currentMedia: ContentJSON.content.MediaName,
        isPaused: ContentJSON.content.IsPaused,
        host: UserID,
        type: RoomType as "private" | "public",
        mods: [],
        members: [UserID],
        messages: {}
    }

    getSession(UserID).send(JSON.stringify({
        type: "info",
        content: {
            RoomID
        }
    }));

    broadcastToAdmins({ 
        type: "userHost", 
        content: {
            RoomID,
            MediaName: ContentJSON.content.MediaName,
            IsPaused: ContentJSON.content.IsPaused,
            Host: UserID
        } 
    });
});

registerProtocol("join")((UserID: string, ContentJSON: sendMessageTypes.join): void => {
    if(!validateMessage(ContentJSON, { type: "test", content: { RoomID: "" } })) 
        return sendError(UserID, `Invalid message format for ${ContentJSON.type}.`);

    if(!rooms[ContentJSON.content.RoomID])
        return sendError(UserID, `Unknown room ${ContentJSON.content.RoomID}.`);

    const isInRoom: boolean = members[UserID].In !== "",
        RoomID: string = ContentJSON.content.RoomID;

    if(isInRoom) 
        return sendError(UserID, `Member ${UserID} is already belong to a room.`);

    rooms[RoomID].members.push(UserID);
    members[UserID].In = RoomID;

    const currentRoom: RoomsObj[""] = rooms[RoomID],
        membersObj: { [MemberID: string]: { Username: string, Avt: string } } = {};

    for(const memberID of currentRoom.members) {
        membersObj[memberID] = {
            Username: members[memberID].UserName,
            Avt: members[memberID].Avt
        };
    }

    const toSend: { [Props: string]: any } = {
        CurrentMedia: currentRoom.currentMedia,
        IsPaused: currentRoom.isPaused,
        Mods: currentRoom.mods,
        Members: membersObj,
        Messages: currentRoom.messages
    };

    if(rooms[RoomID].type === "private") 
        toSend.RoomID = RoomID;

    getSession(UserID).send(JSON.stringify({ type: "init", content: toSend }));

    broadcastToRoom(RoomID, { 
        type: "join", 
        content: {
            UserID,
            UserName: members[UserID].UserName,
            Avt: members[UserID].Avt
        } 
    }, UserID);

    broadcastToAdmins({ 
        type: "userJoin", 
        content: {
            UserID,
            Target: RoomID
        } 
    });
    print(`${UserID} joined a room.`, RoomID);
});

registerProtocol("leave")((UserID: string, ContentJSON: sendMessageTypes.leave): void => {
    if(!validateMessage(ContentJSON, { type: "" }))
        return sendError(UserID, `Invalid message format for ${ContentJSON.type}.`);

    const RoomID: string = members[UserID].In;
    if(!RoomID) 
        return sendError(UserID, `Member ${UserID} does not belong to a room.`);

    if(UserID === rooms[RoomID].host) {
        broadcastToRoom(RoomID, { type: "end", content: undefined });

        for(const MemberID of rooms[RoomID].members)
            members[MemberID].In = "";

        delete rooms[RoomID];
        broadcastToAdmins({ type: "roomEnd", content: { RoomID } });
        print(`${UserID} ended their room session.`, RoomID);
    }
    else {
        rooms[RoomID].members.splice(rooms[RoomID].members.indexOf(UserID), 1);
        broadcastToRoom(RoomID, { type: "leave", content: { MemberID: UserID } });
        members[UserID].In = "";
        broadcastToAdmins({
            type: "memberLeave",
            content: {
                RoomID,
                UserID
            }
        });
        print(`${UserID} left.`, RoomID);
    }
});

registerProtocol("message")((UserID: string, ContentJSON: sendMessageTypes.message): void => {
    if(!validateMessage(ContentJSON, { type: "test", content: { Text: "test" } })) 
        return sendError(UserID, `Invalid message format for ${ContentJSON.type}.`);

    const RoomID: string = members[UserID].In;
    if(!members[UserID].In) 
        return sendError(UserID, `Member ${UserID} does not belong to a room.`);

    const MessageID: string = generateUniqueUUID((UUID: string): boolean => !Boolean(rooms[RoomID].messages[UUID])),
        MessageObject = {
            Sender: UserID,
            Text: ContentJSON.content.Text,
            Timestamp: getCurrentTime()
        };

    rooms[RoomID].messages[MessageID] = MessageObject;

    broadcastToRoom(RoomID, { 
        type: "message", 
        content: {
            MessageID,
            ...MessageObject
        } 
    });

    print(`${UserID}: ${ContentJSON.content.Text}`, RoomID);
});

registerProtocol("election")((UserID: string, ContentJSON: sendMessageTypes.election): void => {
    if(!validateMessage(ContentJSON, { type: "test", content: { MemberID: "test" } }))
        return sendError(UserID, `Invalid message format for ${ContentJSON.type}.`);

    const RoomID: string = members[UserID].In;
    if(!RoomID) 
        return sendError(UserID, `Member ${UserID} does not belong to a room.`);
    
    const isMemberBelongToRoom = rooms[RoomID].members.includes(ContentJSON.content.MemberID),
        isMemberAMod = rooms[RoomID].mods.includes(ContentJSON.content.MemberID),
        doesMemberHasPermission = rooms[RoomID].host == UserID,
        isEligibleForElection = isMemberBelongToRoom && !isMemberAMod && doesMemberHasPermission;

    if(isEligibleForElection) {
        rooms[RoomID].mods.push(ContentJSON.content.MemberID);

        broadcastToRoom(RoomID, ContentJSON);

        broadcastToAdmins({ 
            type: "userElection", 
            content: {
                RoomID,
                Target: ContentJSON.content.MemberID
            }
        });
        print(`${ContentJSON.content.MemberID} elected to moderator by the host.`, RoomID);
    }
    else if(!doesMemberHasPermission) 
        sendError(UserID, "Insufficient permission.");
    else if(isMemberAMod)
        sendError(UserID, `Member ${ContentJSON.content.MemberID} is already a moderator.`);
    else sendError(UserID, `Unknown member ${ContentJSON.content.MemberID}: Member does not exist or does not belong to this room.`);
});

registerProtocol("demotion")((UserID: string, ContentJSON: sendMessageTypes.demotion): void => {
    if(!validateMessage(ContentJSON, { type: "test", content: { MemberID: "test" } })) 
        return sendError(UserID, `Invalid message format for ${ContentJSON.type}.`);
    
    const RoomID: string = members[UserID].In;

    if(!RoomID) 
        return sendError(UserID, `Member ${UserID} does not belong to a room.`);
        
    const isMemberBelongToRoom: boolean = rooms[RoomID].members.includes(ContentJSON.content.MemberID),
        isMemberAMod: boolean = rooms[RoomID].mods.includes(ContentJSON.content.MemberID),
        doesMemberHasPermission: boolean = rooms[RoomID].host == UserID,
        isEligibleForDemotion: boolean = isMemberBelongToRoom && isMemberAMod && doesMemberHasPermission;

    if(isEligibleForDemotion) {
        rooms[RoomID].mods.splice(rooms[RoomID].mods.indexOf(ContentJSON.content.MemberID), 1);

        broadcastToRoom(RoomID, { type: "demotion", content: ContentJSON.content });

        broadcastToAdmins({ 
            type: "userDemotion", 
            content: {
                RoomID,
                Target: ContentJSON.content.MemberID
            } 
        });

        print(`${ContentJSON.content.MemberID} demoted by the host.`, RoomID);
    }
    else if(!doesMemberHasPermission) 
        sendError(UserID, "Insufficient permission.");
    else if(!isMemberAMod)
        sendError(UserID, `Member ${ContentJSON.content.MemberID} is not a moderator.`);
    else sendError(UserID, `Unknown member ${ContentJSON.content.MemberID}: Member does not exist or does not belong to this room.`);
});

registerProtocol("pause")((UserID: string, ContentJSON: sendMessageTypes.pause): void => {
    if(!validateMessage(ContentJSON, { type: "test", content: { IsPaused: false } }))
        return sendError(UserID, `Invalid message format for ${ContentJSON.type}.`);

    const RoomID: string = members[UserID].In;
    if(!RoomID)
        return sendError(UserID, "Not currently in a room.");

    if(UserID !== rooms[RoomID].host && rooms[RoomID].type === "public") 
        return sendError(UserID, "Insufficient permission.");

    rooms[RoomID].isPaused = ContentJSON.content.IsPaused;
    broadcastToRoom(RoomID, ContentJSON);
    print(`${UserID} paused.`, RoomID);
});

registerProtocol("sync")((UserID: string, ContentJSON: sendMessageTypes.sync): void => {
    if(!validateMessage(ContentJSON, { type: "test", content: { Timestamp: 1234 } }))
        return sendError(UserID, `Invalid message format for ${ContentJSON.type}.`);

    const RoomID: string = members[UserID].In;
    if(!RoomID)
        return sendError(UserID, `Member ${UserID} does not belong to a room.`);

    if(UserID !== rooms[RoomID].host && rooms[RoomID].type === "public") 
        return sendError(UserID, "Insufficient permission.");

    broadcastToRoom(RoomID, ContentJSON);
    print(`${UserID} skipped to ${ContentJSON.content.Timestamp}`, RoomID);
});

registerProtocol("upload")((UserID: string, ContentJSON: sendMessageTypes.upload): void => {

});

registerProtocol("adminLogin")((AdminID: string, ContentJSON: adminSendMessageTypes.adminLogin): void => {
    if(!validateMessage(ContentJSON, { type: "test", content: { Password: "string" } })) 
        return sendError(AdminID, `Invalid message format for ${ContentJSON.type}.`);

    if(adminIDs.includes(AdminID)) 
        return sendError(AdminID, "Already logged in as an admin.");

    if(members[AdminID].AdminLoginAttempts > config.MaxAdminLoginAttempts) 
        return sendError(AdminID, "Exceeded the login attempt count, cannot continue.");

    if(ContentJSON.content.Password !== config.PanelPassword) {
        members[AdminID].AdminLoginAttempts += 1;
        return sendError(AdminID, "Incorrect admin password, please try again.");
    }
    
    members[AdminID].AdminLoginAttempts = 0;
    adminIDs.push(AdminID);
    const membersObj: { [MemberID: string]: { UserName: string, Avt: string } } = {};

    for(const memberID in members) {
        membersObj[memberID] = {
            UserName: members[memberID].UserName,
            Avt: members[memberID].Avt
        };
    }

    getSession(AdminID).send(JSON.stringify({
        type: "adminInit", 
        content: {
            Logs: logs.join("\n"),
            Rooms: rooms,
            Members: membersObj
        }
    }));
});

registerProtocol("adminLogout")((AdminID: string, ContentJSON: adminSendMessageTypes.adminLogout): void => {
    if(!validateMessage(ContentJSON, { type: "adminLogout" })) 
        return sendError(AdminID, `Invalid message format for ${ContentJSON.type}.`);

    if(!adminIDs.includes(AdminID)) 
        return sendError(AdminID, "Not logged in as an admin.");

    adminIDs.splice(adminIDs.indexOf(AdminID), 1);
});

registerProtocol("shutdown")((AdminID: string, ContentJSON: adminSendMessageTypes.shutdown): void => {
    if(!validateMessage(ContentJSON, { type: "shutdown" }))
        return sendError(AdminID, `Invalid message format for ${ContentJSON.type}.`);

    if(!adminIDs.includes(AdminID)) 
        return sendError(AdminID, "Insufficient permission.");

    close();
});

const broadcastToRoom = (RoomID: string, ContentJSON: SendMessageTypes, ...except: string[]): void => {
        if(!rooms[RoomID])
            return;

        for(const UserID of rooms[RoomID].members) {
            const member: MembersObj[""] = members[UserID];
            const session: ws.WebSocket = getSession(UserID);
            if(member && session && session.readyState === ws.WebSocket.OPEN && !except.includes(UserID)) {
                session.send(JSON.stringify(ContentJSON));
            }
        }
    }, 
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
    writeLog = async (): Promise<void> => { 
        await fs.writeFile(path.join("logs", generateUniqueUUID((UUID: string): boolean => existsSync(path.join("logs", `${UUID}.log`)))), logs.join("\n"), { encoding: "utf-8" });
        logs.length = 0;
    },
    sendError = (UserID: string, Message: string): void => getSession(UserID).send(JSON.stringify({
        type: "error",
        content: { Message }
    })), 
    getSession = (UserID: string): ws.WebSocket => members[UserID].Socket,
    broadcastToAdmins = (ContentJSON: AdminSendMessageTypes): void => {
        for(const admin of adminIDs) {
            getSession(admin).send(JSON.stringify(ContentJSON));
        }
    }, 
    generateUniqueUUID = (prerequisite: (UUID: string) => boolean): string => {
        let UUID: string;

        do {
            UUID = crypto.randomUUID();
        } while(prerequisite(UUID));

        return UUID;
    };

server.on("error", close);
process.on("SIGTERM", close);
process.on("SIGINT", close);
process.on("SIGHUP", close);
process.on("uncaughtException", close);
process.on("unhandledRejection", close);

server.listen(config.PORT, () => {
    console.log(`Hello World! Server's running at port ${config.PORT}.`);
    if(config.RegeneratePassword) {
        setInterval(async () => {
            config.PanelPassword = generatePassword(config.AdminPasswordLength, config.PanelPassword);
            await fs.writeFile(path.join("./server-properties", "config.json"), JSON.stringify(config, null, 4), { encoding: "utf-8" });
            print(`Password resetted. Current Admin panel password is: ${config.PanelPassword}`);
        }, hoursToMs(config.PasswordRegenerationIntervalHours));
    }
    if(config.ServerTerminalFlushing) {
        setInterval(async () => {
            await writeLog();
            clear();
            print(`Current Admin panel password is: ${config.PanelPassword}`);
        }, hoursToMs(config.FlushingIntervalHours));
    }
});