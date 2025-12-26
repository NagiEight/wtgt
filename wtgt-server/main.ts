"use strict";

import fs from "fs/promises";
import path from "path";

import validateMessage from "./helpers/validateMessage.js";
import getCurrentTime from "./helpers/getCurrentTime.js";
import generatePassword from "./helpers/generatePassword.js";

import * as sendMessageTypes from "./types/client-to-server.js";
import * as adminSendMessageTypes from "./types/admin-to-server.js";
import { Server } from "./internal/server.js";

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

    const RoomID: string = Server.generateUniqueUUID((UUID: string) => !Server.rooms[UUID]),
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
    //
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

Server.server.on("error", Server.close);
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