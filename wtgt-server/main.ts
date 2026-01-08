"use strict";

import util from "util";
import readline from "readline";

import { ChildProcessWithoutNullStreams, spawn } from "child_process";

import validateMessage from "./helpers/validateMessage.js";
import getCurrentTime from "./helpers/getCurrentTime.js";

import * as sendMessageTypes from "./types/client-to-server.js";
import * as adminSendMessageTypes from "./types/admin-to-server.js";
import * as Server from "./internal/server.js";
import * as db from "./internal/dbManager.js";

import { command } from "./internal/commandParser.js";
import { Room } from "./internal/server.js";

const monitorableTerm: ChildProcessWithoutNullStreams = spawn("node", ["./helpers/echo.js"], { stdio: "pipe" });

const sendInitMessage = (RoomID: string, UserID: string): void => {
        const Room: Room = Server.rooms[RoomID];    

        Room.Members.push(UserID);
        Server.members[UserID].In = RoomID;

        const toSend: { [Props: string]: any } = {
            CurrentMedia: Room.CurrentMedia,
            IsPaused: Room.IsPaused,
            Mods: Room.Mods,
            Members: Object.fromEntries(Room.Members.map((MemberID: string) => [MemberID, { UserName: Server.members[MemberID].UserName, Avt: Server.members[MemberID].Avt }])),
            Messages: Room.Messages,
            RoomID: RoomID
        };

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
    },
    renderConsole = (): void => {
        console.clear();
        console.log(Server.logs.join("\n"));
        
        const start: number = currentInput.search(/\S/);
        let index: number = currentInput.indexOf(" ", start);

        if(index === -1)
            index = currentInput.length;

        const toPrint: string = `${util.styleText(["yellowBright"], currentInput.substring(0, index))}${currentInput.substring(index)}`;

        const prompt: string = `${consolePrompt}${toPrint}`;
        process.stdout.write(prompt);
        readline.cursorTo(process.stdout, consolePrompt.length + cursorPos)
    }
;

interface onKeyPress {
    sequence: string;
    ctrl: boolean;
    meta: boolean;
    shift: boolean;
    name?: string;
    code?: string;
}

let consoleFlushingTimer: NodeJS.Timeout,
    currentInput: string = "",
    cursorPos: number = 0,
    consolePrompt = "Console Command: "
;

Server.monitorableTerm(monitorableTerm);
readline.emitKeypressEvents(process.stdin);
process.stdin.setEncoding("utf-8");
process.stdin.resume();

if(process.stdin.isTTY) {
    process.stdin.setRawMode(true);
}

process.stdin.on("keypress", async (str: string, key: onKeyPress): Promise<void> => {
    if(!key)
        return;

    if(key.name === "return" || key.name === "enter") {
        if(!currentInput.trim())
            return;

        try {
            await command.execute(currentInput);
        }
        catch(err) {
            Server.print(err instanceof Error ? err.message : err);
        }
        currentInput = "";
        cursorPos = 0;
    }
    else if((key.name === "backspace" || str === "\x7f") && cursorPos > 0) {
        currentInput = `${currentInput.slice(0, cursorPos - 1)}${currentInput.slice(cursorPos)}`;
        cursorPos--;
    }
    else if(key.name === "left" && cursorPos > 0) 
        cursorPos--;
    else if(key.name === "right" && cursorPos < currentInput.length) 
        cursorPos++;
    else if(key.sequence && key.sequence.length === 1 && !key.ctrl && !key.meta && (key.name !== "backspace" || str !== "\x7f")) {
        currentInput = `${currentInput.slice(0, cursorPos)}${key.sequence}${currentInput.slice(cursorPos)}`;
        cursorPos++;
    }
    else return;

    renderConsole();
});

// fake ass decorator
Server.registerProtocol("host")
(async (UserID: string, ContentJSON: sendMessageTypes.host): Promise<void> => {
    if(!validateMessage(ContentJSON, { type: "test", content: { Limit: 1, MediaName: "test", RoomType: "test", IsPaused: true }})) 
        return Server.sendError(UserID, `Invalid message format for ${ContentJSON.type}.`);

    if(Server.members[UserID].In) 
        return Server.sendError(UserID, `Member ${UserID} is already belong to a room.`);

    const allowedRoomTypes: string[] = [
        "private",
        "public"
    ];

    const RoomType: string = ContentJSON.content.RoomType;

    if(!allowedRoomTypes.includes(RoomType))
        return Server.sendError(UserID, `Unknown room type: ${RoomType}.`);
    
    const RoomLimit: number = ContentJSON.content.Limit;
    if(RoomLimit < 1) 
        return Server.sendError(UserID, "Cannot create a room with less than 1 member");
    
    if(RoomLimit === 1)
        return Server.sendError(UserID, "Just watch it on VLC at this point.");

    if(ContentJSON.content.Limit > Server.config.RoomLimit)
        return Server.sendError(UserID, "Exceeded the room member limit.");

    const RoomID: string = Server.generateUniqueUUID((UUID: string) => Boolean(Server.rooms[UUID])),
        MediaName: string = ContentJSON.content.MediaName,
        IsPaused: boolean = ContentJSON.content.IsPaused
    ;

    Server.members[UserID].In = RoomID;
    Server.rooms[RoomID] = {
        CurrentMedia: MediaName,
        IsPaused,
        Host: UserID,
        Limit: RoomLimit,
        Type: RoomType as "private" | "public",
        Mods: [],
        Queue: [],
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
(async (UserID: string, ContentJSON: sendMessageTypes.join): Promise<void> => {
    if(!validateMessage(ContentJSON, { type: "test", content: { RoomID: "" } })) 
        return Server.sendError(UserID, `Invalid message format for ${ContentJSON.type}.`);

    if(Server.members[UserID].In) 
        return Server.sendError(UserID, `Member ${UserID} is already belong to a room.`);
    
    const RoomID: string = ContentJSON.content.RoomID;
    const Room: Room = Server.rooms[RoomID];
    if(!Room)
        return Server.sendError(UserID, `Unknown room ${RoomID}.`);

    if(Room.Members.length + Room.Queue.length === Room.Limit)
        return Server.sendError(UserID, "Maximum room member reached.");    

    if(Room.Type === "private") {
        const MemberProfile = Server.members[UserID];
        Room.Queue.push(UserID);
        Server.getSession(Room.Host).send(JSON.stringify({
            type: "newMember", 
            content: {
                MemberID: UserID,
                UserName: MemberProfile.UserName,
                Avt: MemberProfile.Avt
            }
        }));
        Server.print(`${UserID} get puts in queue for room ${RoomID}.`);
        return;
    }
    sendInitMessage(RoomID, UserID);
});

Server.registerProtocol("leave")
(async (UserID: string, ContentJSON: sendMessageTypes.leave): Promise<void> => {
    if(!validateMessage(ContentJSON, { type: "" }))
        return Server.sendError(UserID, `Invalid message format for ${ContentJSON.type}.`);

    const RoomID: string = Server.members[UserID].In;
    if(!RoomID) 
        return Server.sendError(UserID, `You do not belong to a room.`);

    const Room: Room = Server.rooms[RoomID];

    if(UserID === Room.Host) {
        Server.broadcastToRoom(RoomID, { type: "end", content: undefined });

        for(const MemberID of Room.Members)
            Server.members[MemberID].In = "";

        delete Server.rooms[RoomID];
        Server.broadcastToAdmins({ type: "roomEnd", content: { RoomID } });
        Server.print(`${UserID} ended their room session.`, RoomID);
        return;
    }
    
    const roomMember: string[] = Room.Members;
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
(async (UserID: string, ContentJSON: sendMessageTypes.message): Promise<void> => {
    if(!validateMessage(ContentJSON, { type: "test", content: { Text: "test" } })) 
        return Server.sendError(UserID, `Invalid message format for ${ContentJSON.type}.`);

    const RoomID: string = Server.members[UserID].In;
    if(!RoomID) 
        return Server.sendError(UserID, `You do not belong to a room.`);

    const MessageID: string = Server.generateUniqueUUID((UUID: string): boolean => Boolean(Server.rooms[RoomID].Messages[UUID])),
        Text: string = ContentJSON.content.Text,
        MessageObject = {
            Sender: UserID,
            Text,
            Timestamp: getCurrentTime()
        }
    ;

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
(async (UserID: string, ContentJSON: sendMessageTypes.election): Promise<void> => {
    if(!validateMessage(ContentJSON, { type: "test", content: { Target: "test" } }))
        return Server.sendError(UserID, `Invalid message format for ${ContentJSON.type}.`);

    const RoomID: string = Server.members[UserID].In;
    if(!RoomID) 
        return Server.sendError(UserID, `You do not belong to a room.`);
    
    const Target: string = ContentJSON.content.Target,
        Room: Room = Server.rooms[RoomID],
        isMemberBelongToRoom = Room.Members.includes(Target),
        isMemberAMod = Room.Mods.includes(Target),
        doesMemberHasPermission = Room.Host == UserID,
        isEligibleForElection = isMemberBelongToRoom && !isMemberAMod && doesMemberHasPermission
    ;

    if(isEligibleForElection) {
        Room.Mods.push(Target);

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
(async (UserID: string, ContentJSON: sendMessageTypes.demotion): Promise<void> => {
    if(!validateMessage(ContentJSON, { type: "test", content: { Target: "test" } })) 
        return Server.sendError(UserID, `Invalid message format for ${ContentJSON.type}.`);
    
    const RoomID: string = Server.members[UserID].In;

    if(!RoomID) 
        return Server.sendError(UserID, `You do not belong to a room.`);
        
    const Target: string = ContentJSON.content.Target,
        Room: Room = Server.rooms[RoomID],
        isMemberBelongToRoom: boolean = Room.Members.includes(Target),
        isMemberAMod: boolean = Room.Mods.includes(Target),
        doesMemberHasPermission: boolean = Room.Host == UserID,
        isEligibleForDemotion: boolean = isMemberBelongToRoom && isMemberAMod && doesMemberHasPermission
    ;

    if(isEligibleForDemotion) {
        Room.Mods.splice(Room.Mods.indexOf(Target), 1);

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
(async (UserID: string, ContentJSON: sendMessageTypes.pause): Promise<void> => {
    if(!validateMessage(ContentJSON, { type: "test", content: { IsPaused: false } }))
        return Server.sendError(UserID, `Invalid message format for ${ContentJSON.type}.`);

    const RoomID: string = Server.members[UserID].In;
    if(!RoomID)
        return Server.sendError(UserID, "Not currently in a room.");
    
    const Room: Room = Server.rooms[RoomID];
    if(UserID !== Room.Host && Room.Type === "public") 
        return Server.sendError(UserID, "Insufficient permission.");

    Room.IsPaused = ContentJSON.content.IsPaused;
    Server.broadcastToRoom(RoomID, ContentJSON);
    Server.print(`${UserID} paused.`, RoomID);
});

Server.registerProtocol("sync")
(async (UserID: string, ContentJSON: sendMessageTypes.sync): Promise<void> => {
    if(!validateMessage(ContentJSON, { type: "test", content: { Timestamp: 1234 } }))
        return Server.sendError(UserID, `Invalid message format for ${ContentJSON.type}.`);

    const RoomID: string = Server.members[UserID].In;
    if(!RoomID)
        return Server.sendError(UserID, `You do not belong to a room.`);

    const Room: Room = Server.rooms[RoomID];
    if(UserID !== Room.Host && Room.Type === "public") 
        return Server.sendError(UserID, "Insufficient permission.");

    Server.broadcastToRoom(RoomID, ContentJSON);
    Server.print(`${UserID} skipped to ${ContentJSON.content.Timestamp}`, RoomID);
});

Server.registerProtocol("upload")
(async (UserID: string, ContentJSON: sendMessageTypes.upload): Promise<void> => {
    if(!validateMessage(ContentJSON, { type: "upload", content: { MediaName: "" } }))
        return Server.sendError(UserID, `Invalid message format for ${ContentJSON.type}.`);

    const RoomID: string = Server.members[UserID].In;
    if(!RoomID)
        return Server.sendError(UserID, `You do not belong to a room.`);

    const Room: Room = Server.rooms[RoomID];
    if(UserID !== Room.Host) 
        return Server.sendError(UserID, "Insufficient permission.");

    Room.CurrentMedia = ContentJSON.content.MediaName;
    Server.broadcastToRoom(RoomID, ContentJSON);
});

Server.registerProtocol("query")
(async (UserID: string, ContentJSON: sendMessageTypes.query): Promise<void> => {
    if(!validateMessage(ContentJSON, { type: "test" })) 
        return Server.sendError(UserID, `Invalid message format for ${ContentJSON.type}.`);

    Server.getSession(UserID).send(JSON.stringify({
        type: "queryResult",
        content: Object.fromEntries(Object.keys(Server.rooms).filter((RoomID: string): boolean => Server.rooms[RoomID].Type === "public").map((RoomID: string) => [RoomID, Server.rooms[RoomID]]))
    }));
});

Server.registerProtocol("approve")
(async (UserID: string, ContentJSON: sendMessageTypes.approve): Promise<void> => {
    if(!validateMessage(ContentJSON, { type: "test", content: { MemberID: "test" } })) 
        return Server.sendError(UserID, `Invalid message format for ${ContentJSON.type}.`);

    const RoomID: string = Server.members[UserID].In;
    if(!RoomID)
        return Server.sendError(UserID, `You do not belong to a room.`);

    const Room: Room = Server.rooms[RoomID];
    if(Room.Members.length === Room.Limit)
        return Server.sendError(UserID, "Maximum room member reached.");

    if(UserID !== Room.Host && !Room.Mods.includes(UserID)) 
        return Server.sendError(UserID, "Insufficient permission.");

    const MemberID: string = ContentJSON.content.MemberID;
    if(!Server.members[MemberID])
        return Server.sendError(UserID, `Member ${MemberID} doesn't exists.`);

    Room.Queue.splice(Room.Queue.indexOf(MemberID), 1);
    sendInitMessage(RoomID, MemberID);
});

Server.registerProtocol("register")
(async (AdminID: string, ContentJSON: adminSendMessageTypes.register): Promise<void> => {
    if(!validateMessage(ContentJSON, { type: "", content: { UserName: "", Password: "" } }))
        Server.sendError(AdminID, `Invalid message format for ${ContentJSON.type}.`);

    const UserName: string = ContentJSON.content.UserName;
    const existence = db.exists(UserName);
    if(existence.Exists)
        return Server.sendError(AdminID, `Username ${UserName} already exists, choose another.`);

    try {
        await db.add(UserName, ContentJSON.content.Password);
    }
    catch(err) {
        Server.sendError(AdminID, err.message);
    }
});

Server.registerProtocol("adminLogin")
(async (AdminID: string, ContentJSON: adminSendMessageTypes.adminLogin): Promise<void> => {
    if(!validateMessage(ContentJSON, { type: "test", content: { UserName: "", Password: "string" } })) 
        return Server.sendError(AdminID, `Invalid message format for ${ContentJSON.type}.`);

    const Admin = Server.members[AdminID];
    if(Admin.IsAuthorized) 
        return Server.sendError(AdminID, "Already logged in as an admin.");

    const UserName: string = ContentJSON.content.UserName;
    const existence = db.exists(UserName);
    if(existence.Exists)
        return Server.sendError(AdminID, `Username ${UserName} doesn't exist, try again.`);

    const AdminProfile = await db.query(UserName);
    if(!AdminProfile.Approved)
        return Server.sendError(AdminID, "Trying to log into an unapproved admin account, cannot continue.");

    if(Admin.AdminLoginAttempts > Server.config.MaxAdminLoginAttempts) 
        return Server.sendError(AdminID, "Exceeded the login attempt count, cannot continue.");

    if(ContentJSON.content.Password !== AdminProfile.Profile.Password) {
        Admin.AdminLoginAttempts += 1;
        return Server.sendError(AdminID, "Incorrect admin password, please try again.");
    }
    
    Admin.AdminLoginAttempts = 0;
    Admin.IsAuthorized = true;
    Server.adminLookUp.push(AdminID);

    Server.getSession(AdminID).send(JSON.stringify({
        type: "adminInit", 
        content: {
            Logs: Server.logs.join("\n"),
            Uptime: Math.floor(process.uptime() * 1000),
            Rooms: Server.rooms,
            Members: Object.fromEntries(Object.keys(Server.members).map((MemberID: string) => [MemberID, { UserName: Server.members[MemberID].UserName, Avt: Server.members[MemberID].Avt }]))
        }
    }));
});

Server.registerProtocol("adminLogout")
(async (AdminID: string, ContentJSON: adminSendMessageTypes.adminLogout): Promise<void> => {
    if(!validateMessage(ContentJSON, { type: "adminLogout" })) 
        return Server.sendError(AdminID, `Invalid message format for ${ContentJSON.type}.`);

    if(!Server.members[AdminID].IsAuthorized) 
        return Server.sendError(AdminID, "Not logged in as an admin.");

    Server.members[AdminID].IsAuthorized = false;
    Server.adminLookUp.splice(Server.adminLookUp.indexOf(AdminID), 1);
});

Server.registerProtocol("shutdown")
(async (AdminID: string, ContentJSON: adminSendMessageTypes.shutdown): Promise<void> => {
    if(!validateMessage(ContentJSON, { type: "shutdown" }))
        return Server.sendError(AdminID, `Invalid message format for ${ContentJSON.type}.`);

    if(!Server.members[AdminID].IsAuthorized) 
        return Server.sendError(AdminID, "Insufficient permission.");

    Server.close();
});

new command("remove", {
    Action: db.remove,
    OnSuccess: (result: string): void => Server.print(`Admin ${result} successfully removed.`),
    OnFailure: (err): void => Server.print(`Error: ${err.message}`),
    Params: {
        UserName: {
            Type: "string",
            Description: "Username of the target admin account."
        }
    },
    Description: "Delete an admin's account."
});

new command("approve", {
    Action: db.approve,
    OnSuccess: (result: string): void => Server.print(`Admin ${result} successfully approved.`),
    OnFailure: (err): void => Server.print(`Error: ${err.message}`),
    Params: {
        UserName: {
            Type: "string",
            Description: "Username of the target admin account."
        }
    },
    Description: "Approve an admin's registration."
});

new command("stop", {
    Action: Server.close,
    Description: "Gracefully stop the server."
});

new command("uptime", {
    Action: (): string => {
        const divmod = (dividend: number, divisor: number): [number, number] => [Math.floor(dividend / divisor), Math.floor(dividend % divisor)];
        const [Tminutes, seconds]: [number, number] = divmod(Math.floor(process.uptime()), 60);
        const [hours, minutes]: [number, number] = divmod(Tminutes, 60);
        return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    },
    OnSuccess: (result: string) => Server.print(`Server's been running for: ${result}.`),
    Description: "Get the amount of time the server's been running."
});

new command("clear", {
    Action: async (): Promise<void> => { 
        await Server.writeLog();
        console.clear();
        if(Server.config.ServerTerminalFlushing) {
            clearInterval(consoleFlushingTimer);
            consoleFlushingTimer = setInterval(async (): Promise<void> => {
                await Server.writeLog();
                console.clear();
            }, Server.hoursToMs(Math.floor(Server.config.FlushingIntervalHours)));
        }
    },
    OnFailure: (err: any): void => Server.print(err),
    Description: "Manually flush the console and reset the server console flushing timer."
});

process.on("uncaughtException", (err) => {
    Server.print(err);
    Server.close();
});
process.on("unhandledRejection", (err) => {
    Server.print(err);
    Server.close();
});

Server.server.listen(Server.config.PORT, () => {
    renderConsole();
    Server.print(`Hello World! Server's running at port ${Server.config.PORT}.`);
    if(Server.config.ServerTerminalFlushing) {
        consoleFlushingTimer = setInterval(async () => {
            await Server.writeLog();
            renderConsole();
        }, Server.hoursToMs(Server.config.FlushingIntervalHours));
    }
});