import * as http from "http";
import * as fs from "fs/promises";
import * as path from "path";
import * as crypto from "crypto";
import * as ws from "ws";

import validateMessage from "./validateMessage.js";
import getCurrentTime from "./getCurrentTime.js";
import generatePassword from "./generatePassword.js";
import resolveBadFileName from "./resolveFileName.js";

import * as sendMessageTypes from "./sendMessageType.js";
import * as adminSendMessageTypes from "./adminSendMessageTypes.js";
import * as receiveMessageTypes from "./receiveMessageTypes.js";
import * as adminReceiveMessageTypes from "./adminReceiveMessageTypes.js";

interface RoomsObj {
    [roomID: string]: {
        currentMedia: string,
        host: string,
        type: "private" | "public",
        isPaused: boolean,
        mods: string[],
        members: string[],
        messages: {
            [messageID: string]: {
                Sender: string,
                Text: string,
                Timestamp: string
            }
        }
    }
}

interface MembersObj {
    [memberID: string]: {
        UserName: string,
        In: string,
        Avt: string,
        AdminLoginAttempts: number,
        Socket: ws.WebSocket
    }
}

interface Config {
    adminPasswordLength: number,
    maxAdminLoginAttempts: number,
    PORT: number,
    regeneratePassword: boolean
}

type LogEntryEvent = "connection" | "disconnection" | "election" | 
    "demotion" | "host" | "message" | 
    "join" | "leave" | "pause" | 
    "sync" | "end" | "upload" | 
    "error"
;

interface LogEntryType {
    event: LogEntryEvent,
    entryTarget: string,
    roomID: string,
    timestamp: string,
    extras?: {[Props: string]: any}
}

type ContentJSONType = sendMessageTypes.host | sendMessageTypes.join | sendMessageTypes.leave |
    sendMessageTypes.message | sendMessageTypes.election | sendMessageTypes.demotion |
    sendMessageTypes.pause | sendMessageTypes.sync | sendMessageTypes.upload |
    adminSendMessageTypes.adminLogin | adminSendMessageTypes.adminLogout | adminSendMessageTypes.shutdown
;

type SendMessageTypes = receiveMessageTypes.info | receiveMessageTypes.init | receiveMessageTypes.join |
    receiveMessageTypes.message | receiveMessageTypes.election | receiveMessageTypes.demotion |
    receiveMessageTypes.leave | receiveMessageTypes.end | receiveMessageTypes.pause |
    receiveMessageTypes.sync | receiveMessageTypes.upload
;

type AdminSendMessageTypes = adminReceiveMessageTypes.adminInit | adminReceiveMessageTypes.log | adminReceiveMessageTypes.userHost |
    adminReceiveMessageTypes.userJoin | adminReceiveMessageTypes.userElection | adminReceiveMessageTypes.userDemotion |
    adminReceiveMessageTypes.memberLeave | adminReceiveMessageTypes.roomEnd | adminReceiveMessageTypes.connection
;

const server: http.Server<typeof http.IncomingMessage, typeof http.ServerResponse> = http.createServer((req, res) => {

    }),
    wss: ws.WebSocketServer = new ws.WebSocketServer({ server }),
    rooms: RoomsObj = {},
    members: MembersObj = {},
    propertiesPath: string = "./server-properties",
    defaultConfig: Config = {
        adminPasswordLength: 16,
        maxAdminLoginAttempts: 5,
        PORT: 3000,
        regeneratePassword: true
    }
;

let credentials: string = "",
    adminIDs: string[] = [],
    config: Config
;

await (async () => {
    await fs.mkdir("server-properties", { recursive: true });
    const configPath: string = path.join(propertiesPath, "config.json");
    const passwordPath: string = path.join(propertiesPath, "password.txt");

    try {
        const content = await fs.readFile(configPath, "utf-8");
        config = JSON.parse(content);

        if(!validateMessage(config, defaultConfig)) {
            await fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 4), { encoding: "utf-8" });
            config = defaultConfig;
        }
    }
    catch(err) {
        console.error(`Error when reading file: ${err}`);
        await fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 4), "utf-8");
        config = defaultConfig;
    }

    if(config.regeneratePassword) {
        credentials = generatePassword(config.adminPasswordLength);
        await fs.writeFile(passwordPath, credentials, { encoding: "utf-8" });
    }
    else credentials = await fs.readFile(passwordPath, { encoding: "utf-8" });
})();

wss.on("connection", (client: ws.WebSocket, req: http.IncomingMessage): void => {
    const url: URL = new URL(req.url, `ws://${req.headers.host}`),
        userProfile = {
            UserName: url.searchParams.get("UserName"),
            Avt: url.searchParams.get("Avt")
        },
        UserID = generateUserUUID()
    ;

    members[UserID] = {
        UserName: userProfile.UserName,
        Avt: userProfile.Avt,
        In: "",
        AdminLoginAttempts: 0,
        Socket: client
    };
    
    broadcastToAdmins({ type: "connection", content: {
        MemberID: UserID,
        UserName: userProfile.UserName,
        Avt: userProfile.Avt
    } });

    client.on("close", (): void => {
        if(adminIDs.includes(UserID))  
            adminLogout(UserID, { type: "adminLogout" });
        
        Logs.addEntry("", "disconnection", UserID);
        delete members[UserID];
    });

    client.on("message", (message: ws.RawData): void => {
        let ContentJSON: ContentJSONType;
        try {
            ContentJSON = JSON.parse(message.toString());
        }
        catch {
            return sendError(UserID, "Invalid JSON message sent, try again.");
        }

        const receivedType = ContentJSON.type;

        switch(ContentJSON.type) {
            case "host":
                return host(UserID, ContentJSON);

            case "join":
                return join(UserID, ContentJSON);

            case "leave":
                return leave(UserID, ContentJSON);

            case "message":
                return sendMessage(UserID, ContentJSON);

            case "election":
                return election(UserID, ContentJSON);

            case "demotion":
                return demotion(UserID, ContentJSON);

            case "pause":
                return pause(UserID, ContentJSON);

            case "sync":
                return sync(UserID, ContentJSON);

            case "upload":
                return upload(UserID, ContentJSON);

            case "adminLogin":
                return adminLogin(UserID, ContentJSON);

            case "adminLogout":
                return adminLogout(UserID, ContentJSON);

            case "shutdown":
                return serverShutDown(UserID, ContentJSON);

            default:
                return sendError(UserID, `Unknown message type: ${receivedType}`);
        }
    });
});

const host = (UserID: string, ContentJSON: sendMessageTypes.host): void => {
    if(!validateMessage(ContentJSON, { type: "test", content: { MediaName: "test", RoomType: "test", IsPaused: true }})) 
        return sendError(UserID, `Invalid message format for ${ContentJSON.type}.`);
    
    const isInRoom = members[UserID].In !== "";
    if(isInRoom) 
        return sendError(UserID, `Member ${UserID} is already belong to a room.`);
    
    const allowedRoomTypes = [
        "private",
        "public"
    ];

    const RoomType = ContentJSON.content.RoomType;

    if(!allowedRoomTypes.includes(RoomType))
        return sendError(UserID, `Unknown room type: ${RoomType}`);

    const RoomID = generateRoomUUID();

    members[UserID].In = RoomID;
    rooms[RoomID] = {
        currentMedia: ContentJSON.content.MediaName,
        isPaused: ContentJSON.content.IsPaused,
        host: UserID,
        type: RoomType,
        mods: [],
        members: [UserID],
        messages: {}
    }

    getSession(UserID).send(JSON.stringify({
        type: "info",
        content: RoomID
    }));

    broadcastToAdmins({ type: "userHost", content: {
        RoomID,
        MediaName: ContentJSON.content.MediaName,
        IsPaused: ContentJSON.content.IsPaused,
        Host: UserID
    } });

    Logs.addEntry(RoomID, "host", UserID);
};

const join = (UserID: string, ContentJSON: sendMessageTypes.join): void => {
    if(!validateMessage(ContentJSON, { type: "test", content: "test" })) 
        return sendError(UserID, `Invalid message format for ${ContentJSON.type}.`);

    if(!Object.keys(rooms).includes(ContentJSON.content)) 
        return sendError(UserID, `Unknown room ${ContentJSON.content}.`);
    
    const isInRoom = members[UserID].In !== "",
        RoomID = ContentJSON.content
    ;

    if(isInRoom) 
        return sendError(UserID, `Member ${UserID} is already belong to a room.`);

    rooms[RoomID].members.push(UserID);
    members[UserID].In = RoomID;

    const currentRoom = rooms[RoomID],
        membersObj = {}
    ;

    for(const memberID of currentRoom.members)
        membersObj[memberID] = {
            UserName: members[memberID].UserName,
            Avt: members[memberID].Avt
        };

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

    broadcastToRoom(RoomID, { type: "join", content: {
        UserID,
        UserName: members[UserID].UserName,
        Avt: members[UserID].Avt
    } }, UserID);

    broadcastToAdmins({ type: "userJoin", content: {
        UserID,
        Target: RoomID
    } });

    Logs.addEntry(RoomID, "join", UserID);
};

const sendMessage = (UserID: string, ContentJSON: sendMessageTypes.message): void => {
    if(!validateMessage(ContentJSON, { type: "test", content: "test" })) 
        return sendError(UserID, `Invalid message format for ${ContentJSON.type}.`);

    const RoomID = members[UserID].In,
        isInRoom = RoomID !== ""
    ;

    if(!isInRoom) 
        return sendError(UserID, `Member ${UserID} does not belong to a room.`);

    const MessageID = generateMessageUUID(RoomID),
        MessageObject = {
            Sender: UserID,
            Text: ContentJSON.content,
            Timestamp: getCurrentTime()
        }
    ;

    rooms[RoomID].messages[MessageID] = MessageObject;

    broadcastToRoom(RoomID, { type: "message", content: {
        MessageID,
        ...MessageObject
    } });

    Logs.addEntry(RoomID, "message", UserID, { text: ContentJSON.content });
};

const election = (UserID: string, ContentJSON: sendMessageTypes.election): void => {
    if(!validateMessage(ContentJSON, { type: "test", content: "test" }))
        return sendError(UserID, `Invalid message format for ${ContentJSON.type}.`);

    const RoomID = members[UserID].In,
        isInRoom = RoomID !== ""
    ;

    if(!isInRoom) 
        return sendError(UserID, `Member ${UserID} does not belong to a room.`);
    
    const isMemberBelongToRoom = rooms[RoomID].members.includes(ContentJSON.content),
        isMemberAMod = rooms[RoomID].mods.includes(ContentJSON.content),
        doesMemberHasPermission = rooms[RoomID].host == UserID,
        isEligibleForElection = isMemberBelongToRoom && !isMemberAMod && doesMemberHasPermission
    ;

    if(isEligibleForElection) {
        rooms[RoomID].mods.push(ContentJSON.content);

        broadcastToRoom(RoomID, { type: "election", content: ContentJSON.content });

        broadcastToAdmins({ type: "userElection", content: {
            RoomID,
            Target: ContentJSON.content
        }});
    }
    else if(!doesMemberHasPermission) 
        sendError(UserID, "Insufficient permission.");
    else if(isMemberAMod)
        sendError(UserID, `Member ${ContentJSON.content} is already a moderator.`);
    else sendError(UserID, `Unknown member ${ContentJSON.content}: Member does not exist or does not belong to this room.`);
};

const demotion = (UserID: string, ContentJSON: sendMessageTypes.demotion): void => {
    if(!validateMessage(ContentJSON, { type: "test", content: "test" })) 
        return sendError(UserID, `Invalid message format for ${ContentJSON.type}.`);
    
    const RoomID = members[UserID].In,
        isInRoom = RoomID !== ""
    ;

    if(!isInRoom) 
        return sendError(UserID, `Member ${UserID} does not belong to a room.`);
        
    const isMemberBelongToRoom = rooms[RoomID].members.includes(ContentJSON.content),
        isMemberAMod = rooms[RoomID].mods.includes(ContentJSON.content),
        doesMemberHasPermission = rooms[RoomID].host == UserID,
        isEligibleForDemotion = isMemberBelongToRoom && isMemberAMod && doesMemberHasPermission
    ;

    if(isEligibleForDemotion) {
        rooms[RoomID].mods = rooms[RoomID].mods.filter(member => member !== ContentJSON.content);

        broadcastToRoom(RoomID, { type: "demotion", content: ContentJSON.content });

        broadcastToAdmins({ type: "userDemotion", content: {
            RoomID,
            Target: ContentJSON.content
        } });

        Logs.addEntry(RoomID, "demotion", ContentJSON.content);
    }
    else if(!doesMemberHasPermission) 
        sendError(UserID, "Insufficient permission.");
    else if(!isMemberAMod)
        sendError(UserID, `Member ${ContentJSON.content} is not a moderator.`);
    else sendError(UserID, `Unknown member ${ContentJSON.content}: Member does not exist or does not belong to this room.`);
};

const leave = (UserID: string, ContentJSON: sendMessageTypes.leave) => {
    if(!validateMessage(ContentJSON, { type: "" }))
        return sendError(UserID, `Member ${UserID} does not belong to a room.`);

    const isInRoom: boolean = members[UserID].In !== "";
    if(!isInRoom) 
        return sendError(UserID, `Member ${UserID} does not belong to a room.`);
    

    const RoomID: string = members[UserID].In;
    if(UserID === rooms[RoomID].host) {
        broadcastToRoom(RoomID, { type: "end", content: undefined });
        
        for(const MemberID of rooms[RoomID].members)
            members[MemberID].In = "";

        delete rooms[RoomID];

        broadcastToAdmins({type: "roomEnd", content: RoomID});

        Logs.addEntry(RoomID, "end", UserID);
    }
    else {
        rooms[RoomID].members = rooms[RoomID].members.filter(member => member !== UserID);
        broadcastToRoom(RoomID, { type: "leave", content: UserID });
        members[UserID].In = "";

        broadcastToAdmins({ type: "memberLeave", content: {
            RoomID,
            UserID
        } });

        Logs.addEntry(RoomID, "leave", UserID);
    }
};

const pause = (UserID: string, ContentJSON: sendMessageTypes.pause) => {
    if(!validateMessage(ContentJSON, { type: "test", content: true })) 
        return sendError(UserID, `Invalid message format for ${ContentJSON.type}.`);
    
    const RoomID = members[UserID].In;
    if(UserID !== rooms[RoomID].host && rooms[RoomID].type === "public") 
        return sendError(UserID, "Insufficient permission.");

    rooms[RoomID].isPaused = ContentJSON.content;

    
    broadcastToRoom(RoomID, { type: "pause", content: ContentJSON.content });

    Logs.addEntry(RoomID, "pause", UserID);
};

const sync = (UserID: string, ContentJSON: sendMessageTypes.sync) => {
    if(!validateMessage(ContentJSON, { type: "test", content: 1.1 })) 
        return sendError(UserID, `Invalid message format for ${ContentJSON.type}.`);

    const RoomID = members[UserID].In;
    if(UserID !== rooms[RoomID].host && rooms[RoomID].type === "public") 
        return sendError(UserID, "Insufficient permission.");

    broadcastToRoom(RoomID, { type: "sync", content: ContentJSON.content });

    Logs.addEntry(RoomID, "sync", UserID, { to: ContentJSON.content });
};

const upload = (UserID: string, ContentJSON: sendMessageTypes.upload) => {
    if(!validateMessage(ContentJSON, { type: "test", content: "test" }))
        return sendError(UserID, `Invalid message format for ${ContentJSON.type}.`);
    
    const roomID = members[UserID].In;
    rooms[roomID].currentMedia = ContentJSON.content;

    broadcastToRoom(roomID, { type: "upload", content: ContentJSON.content });
    Logs.addEntry(roomID, "upload", UserID);
};

const adminLogin = (UserID: string, ContentJSON: adminSendMessageTypes.adminLogin) => {
    if(!validateMessage(ContentJSON, { type: "test", content: "test"})) 
        return sendError(UserID, `Invalid message format for ${ContentJSON.type}.`);

    if(adminIDs.includes(UserID)) 
        return sendError(UserID, "Already logged in as an admin.");

    if(members[UserID].AdminLoginAttempts > config.maxAdminLoginAttempts) 
        return sendError(UserID, "Exceeded the login attempt count, cannot continue.");

    if(ContentJSON.content !== credentials) {
        members[UserID].AdminLoginAttempts += 1;
        return sendError(UserID, "Incorrect admin password, please try again.");
    }
    
    members[UserID].AdminLoginAttempts = 0;
    adminIDs.push(UserID);
    const membersObj: { [MemberID: string]: { UserName: string, Avt: string } } = {};

    for(const memberID of Object.keys(members))
        membersObj[memberID] = {
            UserName: members[memberID].UserName,
            Avt: members[memberID].Avt
        };

    getSession(UserID).send(JSON.stringify({
        type: "adminInit", 
        content: {
            Logs: Logs.toString(),
            Rooms: rooms,
            Members: membersObj
        }
    }));
};

const adminLogout = (UserID: string, ContentJSON: adminSendMessageTypes.adminLogout) => {
    if(!validateMessage(ContentJSON, { type: "test" })) 
        return sendError(UserID, `Invalid message format for ${ContentJSON.type}.`);

    if(!adminIDs.includes(UserID)) 
        return sendError(UserID, "Not logged in as an admin.");

    adminIDs = adminIDs.filter(adminID => adminID !== UserID);
};

const serverShutDown = (UserID: string, ContentJSON: adminSendMessageTypes.shutdown) => {
    if(!validateMessage(ContentJSON, { type: "test" })) 
        return sendError(UserID, `Invalid message format for ${ContentJSON.type}.`);

    if(!adminIDs.includes(UserID)) 
        return sendError(UserID, "Insufficient permission.");
    
    shutdown();
};

const shutdown = (): void => {
    wss.clients.forEach((client: ws.WebSocket) => {
        try {
            client.terminate();
        }
        catch {}
    });

    server.close((): void => {
        Logs.createLog().then();
        process.exit(0);
    });
};

const broadcastToAdmins = ({ type, content }: AdminSendMessageTypes): void => {
    for(const adminID of adminIDs) 
        getSession(adminID).send(JSON.stringify({
            type,
            content
        }));
};

const broadcastToRoom = (roomID: string, { type, content }: SendMessageTypes, ...except: string[]): void => {
    if(!rooms[roomID])
        return;

    for(const memberID of rooms[roomID].members) {
        const member = members[memberID];
        const session: ws.WebSocket = getSession(memberID);
        if(member && session) {
            if(session.readyState === ws.WebSocket.OPEN && !except.includes(memberID)) {
                session.send(JSON.stringify({
                    type,
                    content
                }));
            }
        }
    }
};

const sendError = (UserID: string, message: string): void => {
    getSession(UserID).send(JSON.stringify({
        type: "error",
        content: message
    }));
};

const getSession = (UserID: string): ws.WebSocket => members[UserID].Socket;

const generateUserUUID = (): string => {
    let UUID: string;

    do {
        UUID = crypto.randomUUID();
    } while(Object.keys(members).includes(UUID));

    return UUID;
};

const generateRoomUUID = (): string => {
    let UUID: string;

    do {
        UUID = crypto.randomUUID();
    } while(Object.keys(rooms).includes(UUID));

    return UUID;
};

const generateMessageUUID = (RoomID: string): string => {
    let UUID: string;

    do {
        UUID = crypto.randomUUID();
    } while(Object.keys(rooms[RoomID].messages).includes(UUID));

    return UUID;
};

const Logs = class {
    private static Logs: LogEntryType[] = [];

    private static formatList = {
        connection: " connected.",
        disconnection: " disconnected.",
        election: " elected to modertor.",
        demotion: " demoted by the host.",
        host: " hosted a new room.",
        join: " joined a room.",
        leave: " left.",
        pause: " paused.",
        end: " ended their room session.",
        upload: " uploaded a new media to their room."
    };

    private static generateLogString = (logEntry: LogEntryType, ...suffixes: string[]): string => `[${logEntry.timestamp}]${logEntry.roomID ||= `{${logEntry.roomID}}`} ${logEntry.entryTarget}${suffixes.join("")}`;

    public static addEntry = (roomID: string, event: LogEntryEvent, entryTarget: string, extras?: object) => {
        const logEntry: LogEntryType = {
            event,
            roomID,
            entryTarget,
            extras,
            timestamp: getCurrentTime()
        }

        Logs.Logs.push(logEntry);

        let logString: string;
        switch(event) {
            case "message":
                logString = Logs.generateLogString(logEntry, ": ", logEntry.extras.text, "\n");
                break;
            
            case "sync":
                logString = Logs.generateLogString(logEntry, ": Skipped to ", logEntry.extras.to, ".\n");
                break;
            
            case "error":
                logString = Logs.generateLogString(logEntry, `: Error: ${logEntry.extras.message}`, "\n");
                break;

            default:
                logString = Logs.generateLogString(logEntry, Logs.formatList[logEntry.event], "\n");
                break;
        }

        console.log(logString);
        broadcastToAdmins({ type: "log", content: logString });
    }

    public static clear = (): void => { Logs.Logs.length = 0 };

    public static toString = (): string => Logs.Logs.map((logEntry: LogEntryType): string => {
        switch(logEntry.event) {
            case "message":
                return Logs.generateLogString(logEntry, ": ", logEntry.extras.text).trim();

            case "sync":
                return Logs.generateLogString(logEntry, ": Skipped to ", logEntry.extras.to, ".").trim();

            case "error":
                return Logs.generateLogString(logEntry, `: Error: ${logEntry.extras.message}`).trim();

            default:
                return Logs.generateLogString(logEntry, Logs.formatList[logEntry.event]).trim();
        }
    }).join("\n");

    public static createLog = async (): Promise<void> => {
        const logString: string = Logs.toString();

        if(logString === "")
            return;

        await fs.mkdir("logs", { recursive: true });
        let files: string[];

        try {
            files = await fs.readdir("./logs");
        }
        catch(err) {
            console.error("Error reading folder:", err);
            return;
        }

        let logID: string,
            fileName: string,
            filePath: string
        ;

        do {
            logID = crypto.randomUUID();
            fileName = resolveBadFileName(`${getCurrentTime()}_${logID}.log`);
        } while(files.includes(fileName));
        
        filePath = path.join("logs", fileName);

        await fs.writeFile(filePath, logString, "utf-8");
    };
};

server.on("error", shutdown);
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
process.on("SIGHUP", shutdown);
process.on("uncaughtException", shutdown);
process.on("unhandledRejection", shutdown);

server.listen(config.PORT, (): void => {
    console.log(`Hello World! Server's running at port: ${config.PORT}.`);

    const hoursToMs = (hours: number): number => hours * 3600000;

    setInterval((): void => {
        Logs.createLog().then(() => {
            console.log("Log file written, clearing server log...");
            Logs.clear();
        });
    }, hoursToMs(12));
});