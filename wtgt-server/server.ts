import https from "https";
import http from "http";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

import * as ws from "ws";

import { existsSync } from "fs";

import validateMessage from "./validateMessage.js";
import getCurrentTime from "./getCurrentTime.js";
import generatePassword from "./generatePassword.js";

import * as sendMessageTypes from "./client-to-server.js";
import * as adminSendMessageTypes from "./admin-to-server.js";
import * as receiveMessageTypes from "./server-to-client.js";
import * as adminReceiveMessageTypes from "./server-to-admin.js";

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
    PasswordRegenerationInterval: number;
}

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

const print = (string: string, RoomID?: string): void => {
    console.log(`[${getCurrentTime()}]${RoomID ? `{${RoomID}}` : ""} ${string}`);
    logs.push(`[${getCurrentTime()}] ${string}`);
};

const server: http.Server<typeof http.IncomingMessage, typeof http.ServerResponse> = http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {}),
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
        PasswordRegenerationInterval: 12
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

        if(config.PanelPassword === "") {
            config.PanelPassword = generatePassword(config.AdminPasswordLength);
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
        UserID = generateUserUUID();

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
        let ContentJSON: ContentJSONType;
        try {
            ContentJSON = JSON.parse(data.toString());
        }
        catch(err) {
            return sendError(UserID, "Invalid JSON message sent, try again.");
        }

        const type: ContentJSONType["type"] = ContentJSON.type;
        switch(ContentJSON.type) {
            case "host":
                return host(UserID, ContentJSON);

            case "join":
                return join(UserID, ContentJSON);

            case "leave":
                return leave(UserID, ContentJSON);

            case "message":
                return message(UserID, ContentJSON);
            
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
                return shutdown(UserID, ContentJSON);
            
            default: 
                return sendError(UserID, `Unknown message type: ${type}.`);
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
        return sendError(UserID, `Unknown room type: ${RoomType}.`);

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
};

const join = (UserID: string, ContentJSON: sendMessageTypes.join): void => {
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

    const currentRoom = rooms[RoomID],
        membersObj = {};

    for(const memberID of currentRoom.members) {
        membersObj[memberID] = {
            UserName: members[memberID].UserName,
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
};

const leave = (UserID: string, ContentJSON: sendMessageTypes.leave): void => {
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
};

const message = (UserID: string, ContentJSON: sendMessageTypes.message): void => {
    if(!validateMessage(ContentJSON, { type: "test", content: "test" })) 
        return sendError(UserID, `Invalid message format for ${ContentJSON.type}.`);

    const RoomID: string = members[UserID].In;
    if(!members[UserID].In) 
        return sendError(UserID, `Member ${UserID} does not belong to a room.`);

    const MessageID: string = generateMessageUUID(RoomID),
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
};

const election = (UserID: string, ContentJSON: sendMessageTypes.election): void => {
    if(!validateMessage(ContentJSON, { type: "test", content: "test" }))
        return sendError(UserID, `Invalid message format for ${ContentJSON.type}.`);

    const RoomID = members[UserID].In;
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
};

const demotion = (UserID: string, ContentJSON: sendMessageTypes.demotion): void => {
    if(!validateMessage(ContentJSON, { type: "test", content: "test" })) 
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
};

const pause = (UserID: string, ContentJSON: sendMessageTypes.pause): void => {
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
};

const sync = (UserID: string, ContentJSON: sendMessageTypes.sync): void => {
    if(!validateMessage(ContentJSON, { type: "test", content: { Timestamp: 1234 } }))
        return sendError(UserID, `Invalid message format for ${ContentJSON.type}.`);

    const RoomID: string = members[UserID].In;
    if(!RoomID)
        return sendError(UserID, `Member ${UserID} does not belong to a room.`);

    if(UserID !== rooms[RoomID].host && rooms[RoomID].type === "public") 
        return sendError(UserID, "Insufficient permission.");

    broadcastToRoom(RoomID, ContentJSON);
    print(`${UserID} skipped to ${ContentJSON.content.Timestamp}`, RoomID);
};

const upload = (UserID: string, ContentJSON: sendMessageTypes.upload): void => {

};

const adminLogin = (AdminID: string, ContentJSON: adminSendMessageTypes.adminLogin): void => {
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
}; 

const adminLogout = (AdminID: string, ContentJSON: adminSendMessageTypes.adminLogout): void => {
    if(!validateMessage(ContentJSON, { type: "adminLogout" })) 
        return sendError(AdminID, `Invalid message format for ${ContentJSON.type}.`);

    if(!adminIDs.includes(AdminID)) 
        return sendError(AdminID, "Not logged in as an admin.");

    adminIDs.splice(adminIDs.indexOf(AdminID), 1);
};

const shutdown = (AdminID: string, ContentJSON: adminSendMessageTypes.shutdown): void => {
    if(!validateMessage(ContentJSON, { type: "shutdown" }))
        return sendError(AdminID, `Invalid message format for ${ContentJSON.type}.`);

    if(!adminIDs.includes(AdminID)) 
        return sendError(AdminID, "Insufficient permission.");

    close();
};

const broadcastToRoom = (RoomID: string, ContentJSON: SendMessageTypes, ...except: string[]): void => {
    if(!rooms[RoomID])
        return;

    for(const UserID of rooms[RoomID].members) {
        const member = members[UserID];
        const session: ws.WebSocket = getSession(UserID);
        if(member && session && session.readyState === ws.WebSocket.OPEN && !except.includes(UserID)) {
            session.send(JSON.stringify(ContentJSON));
        }
    }
};

const close = (): void => {
    wss.clients.forEach((client: ws.WebSocket): void => {
        try {
            client.close();
        }
        catch {
            client.terminate();
        }
    });

    server.close(async (): Promise<void> => await fs.writeFile(path.join("logs", generateLogsUUID()), logs.join("\n"), { encoding: "utf-8" }));
    process.exit(0);
};

const sendError = (UserID: string, Message: string): void => getSession(UserID).send(JSON.stringify({
    type: "error",
    content: { Message }
}));

const getSession = (UserID: string): ws.WebSocket => members[UserID].Socket;

const broadcastToAdmins = (ContentJSON: AdminSendMessageTypes): void => {
    for(const admin of adminIDs) {
        getSession(admin).send(JSON.stringify(ContentJSON));
    }
};

const generateRoomUUID = (): string => {
    let UUID: string;

    do {
        UUID = crypto.randomUUID();
    } while(rooms[UUID]);

    return UUID;
};

const generateMessageUUID = (RoomID: string): string => {
    let UUID: string;

    do {
        UUID = crypto.randomUUID();
    } while(rooms[RoomID].messages[UUID]);

    return UUID;
};

const generateLogsUUID = (): string => {
    let UUID: string;
    
    do {
        UUID = crypto.randomUUID();
    } while(existsSync(path.join("logs", `${UUID}.log`)));

    return UUID;
};

const generateUserUUID = (): string => {
    let UUID: string;
    
    do {
        UUID = crypto.randomUUID();
    } while(members[UUID]);

    return UUID;
};

server.listen(config.PORT, () => {
    console.log(`Hello World! Server's running at port ${config.PORT}.`);
    const hoursToMs = (time: number): number => time * 3600000;
    if(config.RegeneratePassword) {
        setInterval(async () => {
            config.PanelPassword = generatePassword(config.AdminPasswordLength, config.PanelPassword);
            await fs.writeFile(path.join("./server-properties", "config.json"), JSON.stringify(config, null, 4), { encoding: "utf-8" });
        }, hoursToMs(config.PasswordRegenerationInterval));
    }
});