//Imports
const http = require("http"),
    ws = require("ws"),
    crypto = require("crypto"),
    fs = require("fs/promises"),
    utils = require("./utils"),
    path = require("path")
;

//Constants
const PORT = 3000,
    /**
     *  ```js
     *  roomID: {
     *      currentMedia: "medianame.mp4",
     *      host: "hostID"
     *      type: "private"
     *      mods: [],
     *      members: [memberIDs],
     *      isPaused: false,
     *      messages: {
     *          messageID: {
     *              Sender: "memberID",
     *              Text: "hello world!",
     *              Timestamp: "somethingsomething"
     *          }
     *      }
     *  }
     *  ```
     */
    rooms = {},
    /**
     *  ```js
     *  MemberID: {
     *      UserName: "Claire Iidea",
     *      In: "roomID",
     *      Socket: wsObj,
     *      Avt: "uri"
     *  }
     *  ```
     */
    members = {},
    server = http.createServer((req, res) => {
        
    }),
    wss = new ws.Server({ server }),
    propertiesPath = "./server-properties",
    defaultConfig = {
        adminPasswordLength: 16,
        maxAdminLoginAttempts: 5,
        regeneratePassword: true
    }
;
    
//runtime variables
let credentials = "",
    adminID = "",
    config = {}
;

(async () => {
    await fs.mkdir("server-properties", { recursive: true });
    const configPath = path.join(propertiesPath, "config.json");
    const passwordPath = path.join(propertiesPath, "password.txt");
    const encoding = "utf-8";

    try {
        const content = await fs.readFile(configPath, "utf-8");
        config = JSON.parse(content);

        if(!utils.validateMessage(config, defaultConfig)) {
            await fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 4), "utf-8");
            config = defaultConfig;
        }
    }
    catch(err) {
        console.error(`Error when reading file: ${err}`);
        await fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 4), "utf-8");
        config = defaultConfig;
    }

    if(config.regeneratePassword) {
        credentials = utils.generatePassword(config.adminPasswordLength);
        await fs.writeFile(passwordPath, credentials, { encoding });
    }
    else credentials = await fs.readFile(passwordPath, { encoding });
})();

wss.on("connection", (client, req) => {
    const url = new URL(req.url, `ws://${req.headers.host}`),
        userProfile = {
            UserName: url.searchParams.get("UserName"),
            Avt: url.searchParams.get("Avt")
        },
        UserID = generateUUID("User")
    ;

    let adminLoginAttempts = 0;

    sendAdminMessage({
        type: "connection",
        content: {
            MemberID: UserID,
            UserName: userProfile.UserName,
            Avt: userProfile.Avt
        }
    });
    
    Logs.addEntry("", "connection", UserID);

    members[UserID] = {
        UserName: userProfile.UserName,
        In: "",
        Socket: client,
        Avt: userProfile.Avt
    };

    client.on("close", () => {
        if(UserID === adminID) 
            adminID = "";
        
        Logs.addEntry("", "disconnection", UserID);
        delete members[UserID];
    });

    client.on("message", (message) => {
        let ContentJSON;
        try {
            ContentJSON = JSON.parse(message.toString());
        }
        catch {
            sendError(client, "Invalid JSON message sent, try again.", UserID)
            return;
        }

        switch(ContentJSON.type) {
            case "host":
                host(ContentJSON, client, UserID);
                break;

            case "join":
                join(ContentJSON, client, UserID);
                break;

            case "message":
                sendMessage(ContentJSON, client, UserID);
                break;

            case "election":
                election(ContentJSON, client, UserID);
                break;
            
            case "demotion":
                demotion(ContentJSON, client, UserID);
                break;
            
            case "leave":
                if(!utils.validateMessage(ContentJSON, { type: "test" })) {
                    sendError(client, `Invalid message format for ${ContentJSON.type}.`, UserID);
                    break;
                }
                leave(client, UserID);
                break;
            
            case "pause":
                pause(ContentJSON, client, UserID);
                break;

            case "sync":
                sync(ContentJSON, client, UserID);
                break;

            case "upload":
                upload(ContentJSON, client, UserID);
                break;

            /**
             * Admin messages.
             */

            /** //Admin-to-server
             *  {
             *      "type": "adminLogin",
             *      "content": "serverPassword"
             *  }
             * 
             *  //Server-to-admin
             *  {
             *      "type": "adminInit", 
             *      "content": {
             *          "Logs": "ServerLogs",
             *          "Rooms": {
             *              "roomID": {
             *                  "currentMedia": "medianame.mp4",
             *                  "mods": [],
             *                  "members": [...memberIDs],
             *                  "isPaused": false,
             *                  "messages": {
             *                      "messageID": {
             *                          "Sender": "memberID",
             *                          "Text": "hello world!",
             *                          "Timestamp": "timestamp"
             *                      }
             *                  }
             *              }
             *          },
             *          "Members": {
             *              "MemberID": {
             *                  "UserName": "Claire Iidea",
             *                  "In": "roomID",
             *                  "Avt": "uri"
             *              }
             *          }
             *      }
             *  }
             * 
             *  {
             *      "type": "log",
             *      "content": "Logstring"
             *  }
             */
            case "adminLogin":
                if(!utils.validateMessage(ContentJSON, { type: "test", content: "test"})) {
                    sendError(client, `Invalid message format for ${ContentJSON.type}.`, UserID);
                    break;
                }

                if(adminID !== "") {
                    sendError(client, `Already exist an admin session with the UUID of ${adminID}.`, UserID);
                    break;
                }

                if(adminLoginAttempts > config.maxAdminLoginAttempts) {
                    sendError(client, "Exceeded the login attempt count, cannot continue.", UserID);
                    break;
                }

                if(ContentJSON.content !== credentials) {
                    adminLoginAttempts += 1;
                    sendError(client, "Incorrect admin password, please try again.", UserID);
                    break;
                }

                adminLoginAttempts = 0;
                adminLogin(UserID, client);
                break;
            
            /** //Note: Server will not return anything in this type of message.
             *  {
             *      "type": "adminLogout"
             *  }
             */
            case "adminLogout":
                if(!utils.validateMessage(ContentJSON, { type: "test" })) {
                    sendError(client, `Invalid message format for ${ContentJSON.type}.`, UserID);
                    break;
                }
                if(UserID !== adminID) {
                    sendError(client, "Trying to logout while not being a server admin.", UserID);
                    break;
                }
                adminID = "";
                break;
            
            /** //Note: Server will not return anything in this type of message.
             *  {
             *      "type": "shutdown"
             *  }
             */
            case "shutdown":
                if(!utils.validateMessage(ContentJSON, { type: "test" })) {
                    sendError(client, `Invalid message format for ${ContentJSON.type}.`, UserID);
                    break;
                }

                if(UserID !== adminID) {
                    sendError(client, "Insufficient permission.", UserID);
                    break;
                }
                
                server.close();
                break;

            default:
                sendError(client, `Unknown request type: ${ContentJSON.type}`, UserID);
                break;
        }
    });
});

const shutdown = () => {
    console.log("Shutting down gracefully...");

    wss.clients.forEach(client => {
        try {
            client.terminate();
        }
        catch(err) {
            console.error("Error closing client:", e);
        }
    });

    server.close(async () => {
        await Logs.createLog();
        console.log("All connections closed, exiting.");
        process.exit(0);
    });

}

const broadcastToRoom = (RoomID, message, except = null) => {
    if(!rooms[RoomID])
        return;
    
    for(const memberID of rooms[RoomID].members) {
        if(memberID === except) 
            continue;

        const member = members[memberID];
        if(member && member.Socket) {
            if(member.Socket.readyState === ws.OPEN) {
                member.Socket.send(JSON.stringify(message));
            }
        }
    }
};

const sendError = (client, message, UserID) => {
    client.send(JSON.stringify({
        type: "error",
        content: message
    }));

    Logs.addEntry("", "error", UserID, { message })
};

/**
 *  ```json
 *  //client-to-server:
 *  {
 *      "type": "host",
 *      "content": {
 *          "MediaName": "helloworld.mp4",
 *          "RoomType": "private"
 *          "IsPaused": true
 *      }
 *  }
 *  //server-to-client:
 *  {
 *      "type": "info",
 *      "content": "roomID"
 *  } 
 * 
 *  //server-to-admin:
 *  {
 *      "type": "userHost",
 *      "content": {
 *          "RoomID": "roomID",
 *          "RoomType": "private",
 *          "MediaName": "helloworld.mp4",
 *          "IsPaused": false,
 *          "Host": "userID"
 *      }  
 *  }
 *  ```
 */
const host = (ContentJSON, client, UserID) => {
    if(!utils.validateMessage(ContentJSON, { type: "test", content: { MediaName: "test", RoomType: "test", IsPaused: true }})) {
        sendError(client, `Invalid message format for ${ContentJSON.type}.`, UserID);
        return;
    }

    const isInRoom = members[UserID].In !== "";
    if(isInRoom) {
        sendError(client, `Member ${UserID} is already belong to a room.`, UserID);
        return;
    }

    const allowedRoomTypes = [
        "private",
        "public"
    ];

    const RoomType = ContentJSON.content.RoomType;

    if(!allowedRoomTypes.includes(RoomType)) {
        sendError(client, `Unknown room type: ${RoomType}`, UserID);
        return;
    }

    let RoomID = generateUUID("Room");
    
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

    client.send(JSON.stringify({
        type: "info",
        content: RoomID
    }));

    sendAdminMessage({
        type: "userHost",
        content: {
            RoomID,
            MediaName: ContentJSON.content.MediaName,
            IsPaused: ContentJSON.content.IsPaused,
            Host: UserID
        }
    });

    Logs.addEntry(RoomID, "host", UserID);
};

/**
 *  ```json
 *  //client-to-server:
 *  {
 *      "type": "join",
 *      "content": "RoomID"
 *  }
 * 
 *  //server-to-client:
 *  { //this one is for the joined member
 *      "type": "init",
 *      "content": {
 *          "CurrentMedia": "helloworld.mp4",
 *          "IsPaused": false,
 *          "Host": "hostID",
 *          "Mods": ["ModID1", "ModID2"],
 *          "Members": {
 *              "MemberID1": {
 *                  "UserName": "Nagi Eight",
 *                  "Avt": "avt"
 *              }
 *          },
 *          "Messages": {
 *              "MessageID1": {
 *                  "Sender": "MemberID1",
 *                  "Text": "hello world!",
 *                  "Timestamp": "timestamp"
 *              }
 *          }
 *      }
 *  }
 * 
 *  { //this one is for the other members of the room
 *      "type": "join",
 *      "content": {
 *          "UserID": "UserID",
 *          "UserName": "Claire Iidea",
 *          "Avt": "avt"
 *      }
 *  }
 * 
 *  //server-to-admin:
 *  {
 *      "type": "userJoin",
 *      "content": "roomID"
 *  }
 *  ```
 */
const join = (ContentJSON, client, UserID) => {
    if(!utils.validateMessage(ContentJSON, { type: "test", content: "test" })) {
        sendError(client, `Invalid message format for ${ContentJSON.type}.`, UserID);
        return;
    }

    if(!Object.keys(rooms).includes(ContentJSON.content)) {
        sendError(client, `Unknown room ${ContentJSON.content}.`, UserID);
        return;
    }
    const isInRoom = members[UserID].In !== "",
        RoomID = ContentJSON.content
    ;

    if(isInRoom) {
        sendError(client, `Member ${UserID} is already belong to a room.`, UserID);
        return;
    }

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

    const toSend = {
        CurrentMedia: currentRoom.currentMedia,
        IsPaused: currentRoom.isPaused,
        Mods: currentRoom.mods,
        Members: membersObj,
        Messages: currentRoom.messages
    };

    if(rooms[RoomID].type === "private") 
        toSend.RoomID = RoomID;

    client.send(JSON.stringify({ type: "init", content: toSend }));

    broadcastToRoom(members[UserID].In, {
        type: "join",
        content: {
            UserID,
            UserName: members[UserID].UserName,
            Avt: members[UserID].Avt
        }
    }, UserID);

    sendAdminMessage({
        type: "userJoin",
        content: {
            UserID,
            Target: ContentJSON.content
        }
    });

    Logs.addEntry(members[UserID].In, "join", UserID);
};

/** 
 *  ```json
 *  //client-to-server:
 *  {
 *      "type": "message",
 *      "content": "Hello World!"
 *  }
 * 
 *  //server-to-client:
 *  {
 *      "type": "message",
 *      "content": {
 *          "MessageID": "MessageID",
 *          "MessageObject": {
 *              "Sender": "SenderID",
 *              "Text": "Hello World!",
 *              "Timestamp": "timestamp"
 *          }
 *      }
 *  }
 *  ```
 */
const sendMessage = (ContentJSON, client, UserID) => {
    if(!utils.validateMessage(ContentJSON, { type: "test", content: "test" })) {
        sendError(client, `Invalid message format for ${ContentJSON.type}.`, UserID);
        return;
    }

    const RoomID = members[UserID].In,
        isInRoom = RoomID !== ""
    ;

    if(!isInRoom) {
        sendError(client, `Member ${UserID} does not belong to a room.`, UserID);
        return;
    }

    const MessageID = generateUUID("Message", {RoomID }),
        MessageObject = {
            Sender: UserID,
            Text: ContentJSON.content,
            Timestamp: utils.getCurrentTime()
        }
    ;
        
    rooms[RoomID].messages[MessageID] = MessageObject;

    broadcastToRoom(members[UserID].In, {
        type: "message",
        content: {
            MessageID,
            MessageObject
        }
    });

    Logs.addEntry(RoomID, "message", UserID, { text: ContentJSON.content });
};

/**
 *  ```json
 *  {
 *      "type": "election",
 *      "content": "UserID"
 *  }
 * 
 *  //server-to-admin
 *  {
 *      "type": "userElection",
 *      "content": {
 *          "RoomID": "roomID",
 *          "Target": "userID"
 *      }
 *  }
 *  ```
 */
const election = (ContentJSON, client, UserID) => {
    if(!utils.validateMessage(ContentJSON, { type: "test", content: "test" })) {
        sendError(client, `Invalid message format for ${ContentJSON.type}.`, UserID);
        return;
    }

    const RoomID = members[UserID].In,
        isInRoom = RoomID !== ""
    ;
    if(!isInRoom) {
        sendError(client, `Member ${UserID} does not belong to a room.`, UserID);
        return;
    }

    const isMemberBelongToRoom = rooms[RoomID].members.includes(ContentJSON.content),
        isMemberAMod = rooms[RoomID].mods.includes(ContentJSON.content),
        doesMemberHasPermission = rooms[RoomID].host == UserID,
        isEligibleForElection = isMemberBelongToRoom && !isMemberAMod && doesMemberHasPermission
    ;

    switch(true) {
        case isEligibleForElection:
            rooms[RoomID].mods.push(ContentJSON.content);

            broadcastToRoom(RoomID, ContentJSON);

            sendAdminMessage({
                type: "userElection",
                content: {
                    RoomID,
                    Target: ContentJSON.content
                }
            });

            Logs.addEntry(RoomID, "election", ContentJSON.content);
            break;
        case !doesMemberHasPermission:
            sendError(client, `Insufficient permission.`, UserID);
            break;
        case isMemberAMod:
            sendError(client, `Member ${ContentJSON.content} is already a moderator.`, UserID);
            break;
        default:
            sendError(client, `Unknown member ${ContentJSON.content}: Member does not exist or does not belong to this room.`, UserID);
            break;
    }
};

/**
 *  ```json
 *  {
 *      "type": "demotion",
 *      "content": "memberID"
 *  }
 * 
 *  { //Server-to-admin
 *      "type": "demotion",
 *      "content": {
 *          "RoomID": "roomID",
 *          "Target": "userID"
 *      }
 *  }
 *  ```
 */
const demotion = (ContentJSON, client, UserID) => {
    if(!utils.validateMessage(ContentJSON, { type: "test", content: "test" })) {
        sendError(client, `Invalid message format for ${ContentJSON.type}.`, UserID);
        return;
    }

    const RoomID = members[UserID].In,
        isInRoom = RoomID !== ""
    ;
    if(!isInRoom) {
        sendError(client, `Member ${UserID} does not belong to a room.`, UserID);
        return;
    }
        
    const isMemberBelongToRoom = rooms[RoomID].members.includes(ContentJSON.content),
        isMemberAMod = rooms[RoomID].mods.includes(ContentJSON.content),
        doesMemberHasPermission = rooms[RoomID].host == UserID,
        isEligibleForDemotion = isMemberBelongToRoom && isMemberAMod && doesMemberHasPermission
    ;

    switch(true) {
        case isEligibleForDemotion:
            rooms[RoomID].mods = rooms[RoomID].mods.filter(member => member !== ContentJSON.content);

            broadcastToRoom(RoomID, ContentJSON);

            sendAdminMessage({
                type: "userDemotion",
                content: {
                    RoomID,
                    Target: ContentJSON.content
                }
            });

            Logs.addEntry(RoomID, "demotion", ContentJSON.content);
            break;
        case !doesMemberHasPermission:
            sendError(client, `Insufficient permission.`, UserID);
            break;
        case !isMemberAMod:
            sendError(client, `Member ${ContentJSON.content} is not a moderator.`, UserID);
            break;
        default:
            sendError(client, `Unknown member ${ContentJSON.content}: Member does not exist or does not belong to this room.`, UserID);
            break;
    }
};

/** 
 *  ```json
 *  //client-to-server:
 *  {
 *      "type": "leave"
 *  }
 * 
 *  //server-to-client:
 *  {
 *      "type": "leave",
 *      "content": "UserID"
 *  }
 *  { //this one is when the host leave
 *      "type": "end"
 *  }
 * 
 *  //server-to-admin:
 *  {
 *      "type": "roomEnd",
 *      "content": "roomID"
 *  }
 *  {
 *      "type": "memberLeave",
 *      "content": {
 *          "RoomID": "roomID",
 *          "UserID": "userID"
 *      }
 *  }
 *  ```
 */
const leave = (client, UserID) => {
    const isInRoom = members[UserID].In !== "";
    if(!isInRoom) {
        sendError(client, `Member ${UserID} does not belong to a room.`, UserID);
        return;
    }

    const RoomID = members[UserID].In;
    if(UserID === rooms[RoomID].host) {
        broadcastToRoom(RoomID, {type: "end"});
        
        for(const MemberID of rooms[RoomID].members)
            members[MemberID].In = "";

        delete rooms[RoomID];

        sendAdminMessage({
            type: "roomEnd",
            content: RoomID
        });

        Logs.addEntry(RoomID, "end", UserID);
    }
    else {
        rooms[RoomID].members = rooms[RoomID].members.filter(member => member !== UserID);
        broadcastToRoom(RoomID, {type: "leave", content: UserID});
        members[UserID].In = "";

        sendAdminMessage({
            type: "memberLeave",
            content: {
                RoomID,
                UserID
            }
        });

        Logs.addEntry(RoomID, "leave", UserID);
    }
};

/**
 *  ```json
 *  {
 *      "type": "pause",
 *      "content": false
 *  }
 *  ```
 */
const pause = (ContentJSON, client, UserID) => {
    if(!utils.validateMessage(ContentJSON, { type: "test", content: true })) {
        sendError(client, `Invalid message format for ${ContentJSON.type}.`, UserID);
        return;
    }
    
    const RoomID = members[UserID].In;
    if(UserID !== rooms[RoomID].host && rooms[RoomID].type === "public") {
        sendError(client, "Insufficient permission.", UserID);
        return;
    }

    rooms[RoomID].isPaused = ContentJSON.content;
    broadcastToRoom(RoomID, ContentJSON);

    Logs.addEntry(RoomID, "pause", UserID);
};

/**
 *  ```json
 *  {
 *      "type": "sync",
 *      "content": 69420
 *  }
 *  ```
 */
const sync = (ContentJSON, client, UserID) => {
    if(!utils.validateMessage(ContentJSON, { type: "test", content: 1 })) {
        sendError(client, `Invalid message format for ${ContentJSON.type}.`, UserID);
        return;
    }

    const RoomID = members[UserID].In;
    if(UserID !== rooms[RoomID].host && rooms[RoomID].type === "public") {
        sendError(client, "Insufficient permission.", UserID);
        return;
    }

    broadcastToRoom(RoomID, ContentJSON, UserID);

    Logs.addEntry(RoomID, "sync", UserID, { to: ContentJSON.content });
};

/**
 *  ```json
 *  {
 *      "type": "upload",
 *      "content": "hello world.mp4"
 *  }
 *  ```
 */
const upload = (ContentJSON, client, UserID) => {
    if(!utils.validateMessage(ContentJSON, { type: "test", content: "test" })) {
        sendError(client, `Invalid message format for ${ContentJSON.type}.`, UserID);
        return;
    }

    const roomID = members[UserID].In;
    rooms[roomID].currentMedia = ContentJSON.content;

    broadcastToRoom(roomID, ContentJSON, UserID);
};

const adminLogin = (UserID, adminClient) => {
    adminID = UserID;

    const membersObj = {};

    for(const memberID of Object.keys(members))
        membersObj[memberID] = {
            UserName: members[memberID].UserName,
            Avt: members[memberID].Avt
        };

    adminClient.send(JSON.stringify({
        type: "adminInit", 
        content: {
            Logs: Logs.toString(),
            Rooms: rooms,
            Members: membersObj
        }
    }));
};

const sendAdminMessage = (JSONContent) => {
    if(adminID === "")
        return;
    
    members[adminID].Socket.send(JSON.stringify(JSONContent));
};

/**
 * 
 * @param {"Room" | "Message" | "User"} type 
 * @param {Object} extras
 */
const generateUUID = (type, extras = {}) => {
    let group;

    switch(type) {
        case "Message":
            group = Object.keys(rooms[extras.RoomID].messages);
            break;

        case "Room":
            group = Object.keys(rooms);
            break;

        case "User":
            group = Object.keys(members);
            break;

        default:
            throw new TypeError(`${type} does not exist as an valid group type.`);
    }

    let UUID;

    do {
        UUID = crypto.randomUUID();
    } while(group.includes(UUID));

    return UUID;
};

const Logs = class {
    /**
     * Server's log. Use addEntry instead of changing this directly.
     */
    static logs = [];

    /**
     * A list of predefined suffix for most logging event types. Don't change this, please.
     */
    static formatList = {
        connection: " connected.",
        disconnection: " disconnected.",
        election: " elected to modertor.",
        demotion: " demoted by the host.",
        host: " hosted a new room.",
        join: " joined a room.",
        leave: " left.",
        pause: " paused.",
        end: " ended their room session."
    };
    
    static generateLogString = (logEntry, ...suffixes) => 
        `[${logEntry.timestamp}]${logEntry.roomID === "" ? "" : `{${logEntry.roomID}}`} ${logEntry.entryTarget}${suffixes.join("")}`;
    
    /**
     * Add a new entry to the logs.
     * 
     * @param {string} roomID 
     * @param {"connection" | "disconnection" | "election" | "demotion" | "host" | "message" | "join" | "leave" | "pause" | "sync" | "end" | "error"} entryType 
     * @param {string} entryTarget 
     * @param {Object} extras 
     */
    static addEntry = (roomID, entryType, entryTarget, extras = {}) => {
        const allowedEntryType = [
            "connection",
            "disconnection",
            "election",
            "demotion",
            "host",
            "message",
            "join",
            "leave",
            "pause",
            "sync",
            "end",
            "error"
        ];

        if(!allowedEntryType.includes(entryType)) 
            throw new TypeError(`Unknown entryType "${entryType}", please try again.`);

        const logEntry = {
            event: entryType,
            entryTarget,
            roomID,
            ...extras,
            timestamp: utils.getCurrentTime()
        };
        Logs.logs.push(logEntry);

        let LogString;
        switch(logEntry.event) {
            case "message":
                LogString = Logs.generateLogString(logEntry, ": ", logEntry.text, "\n");
                break;
                
            case "sync":
                LogString = Logs.generateLogString(logEntry, ": Skipped to ", logEntry.to, ".\n");
                break;
                
            case "error":
                LogString = Logs.generateLogString(logEntry, `: Error: ${logEntry.message}`);
                break;

            default:
                LogString = Logs.generateLogString(logEntry, Logs.formatList[logEntry.event], "\n");
                break;
        }
        console.log(LogString);
        sendAdminMessage({
            type: "log",
            content: LogString
        });
    }

    static toString = () => {
        let output = "";

        for(const logEntry of Logs.logs) {
            switch(logEntry.event) {
                case "message":
                    output += Logs.generateLogString(logEntry, ": ", logEntry.text, "\n");
                    break;
                    
                case "sync":
                    output += Logs.generateLogString(logEntry, ": Skipped to ", logEntry.to, ".\n");
                    break;

                case "error":
                    output += Logs.generateLogString(logEntry, ": Error: ", logEntry.message, "\n");
                    break;

                default:
                    output += Logs.generateLogString(logEntry, Logs.formatList[logEntry.event], "\n");
                    break;
            }
        }

        return output.trim();
    }

    /**
     * Create a log file at logs.
     */
    static createLog = async () => {
        const logstring = Logs.toString();
        if(logstring === "")
            return;

        await fs.mkdir("logs", { recursive: true });
        let files;

        try {
            files = await fs.readdir("./logs");
        }
        catch(err) {
            console.error("Error reading folder:", err);
            return;
        }
        
        let logID,
            fileName,
            filePath
        ;

        do {
            logID = crypto.randomUUID(),
            fileName = `${logID}.log`,
            filePath = path.join("logs", fileName);
        } while(files.includes(fileName));
        
        await fs.writeFile(filePath, logstring, "utf-8");
    };
};

// Log creation and shutdown handling
server.on("error", (err) => {
    console.error("Server error:", err);
    shutdown();
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
    shutdown();
});

process.on("unhandledRejection", (reason) => {
    console.error("Unhandled Rejection:", reason);
    shutdown();
});

server.listen(PORT, () => {
    console.log(`Hello World! Server's running at port: ${PORT}.`);
});