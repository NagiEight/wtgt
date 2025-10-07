//Imports
const
    http = require("http"),
    ws = require("ws"),
    crypto = require("crypto"),
    fs = require("fs/promises"),
    utils = require("./utils"),
    path = require("path")
;

//Constants
const
    PORT = 3000,
    /**
     *  ```js
     *  roomID: {
     *      currentMedia: "medianame.mp4",
     *      host: "hostID"
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
    rooms = {

    },
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
    members = {

    },
    server = http.createServer((req, res) => {
        
    }),
    wss = new ws.Server({ server }),
    propertiesPath = "./server-properties",
    defaultConfig = {
        adminPasswordLength: 16,
        maxAdminLoginAttempts: 5
    }
;
    
    //runtime variables
let
    credentials = "",
    adminID = "",
    config
;

(async () => {
    
    let file;
    
    try {
        file = await fs.open(`${propertiesPath}/config.json`, "w+");
        const content = await file.read({ encoding: "utf-8" });
        config = JSON.parse(content);

        if(!utils.validateMessage(config, defaultConfig)) {
            await file.write(defaultConfig);
            config = defaultConfig;
        }
    }
    catch(err) {
        console.error(`Error when reading file: ${err}`);
        await file.write(JSON.stringify(defaultConfig));
        config = defaultConfig;
    }
    finally {
        await file.close();
    }

    credentials = utils.generatePassword(config.adminPasswordLength);
    await fs.writeFile(`${propertiesPath}/password.txt`, credentials, "utf-8");
})();

wss.on("connection", (client, req) => {
    const
        url = new URL(req.url, `ws://${req.headers.host}`),
        userProfile = {
            UserName: url.searchParams.get("UserName"),
            Avt: url.searchParams.get("Avt")
        },
        UserID = crypto.randomUUID()
    ;
    
    const users = Object.keys(members);
    while(users.includes(UserID))
        UserID = crypto.randomUUID();

    let adminLoginAttempts = 0;

    sendAdminMessage({
        type: "connection",
        content: {
            MemberID: UserID,
            UserName: userProfile.UserName,
            Avt: userProfile.Avt
        }
    });
    
    client.send(JSON.stringify({
        type: "info",
        content: UserID
    }));

    Logs.addEntry("", "connection", UserID);

    members[UserID] = {
        UserName: userProfile.UserName,
        In: "",
        Socket: client,
        Avt: userProfile.Avt
    };

    client.on("close", () => {
        if(UserID === adminID) {
            adminID = "";
        }
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
             *  {
             *      "type": "log",
             *      "content": "logstring"
             *  }
             */
            case "adminLogin":
                if(!utils.validateMessage(ContentJSON, { type: "test", content: "test"})) {
                    sendError(client, `Invalid message format for ${ContentJSON.type}.`, UserID);
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

//classes
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
        join: " joined.",
        leave: " left.",
        pause: " paused.",
        end: " ended their room session."
    };
    
    static generateLogString = (logEntry, suffix = "") => {
        return `{${logEntry.roomID}}[${logEntry.timestamp}] ${logEntry.entryTarget}${suffix}`;
    };
    
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

        if(!allowedEntryType.includes(entryType)) {
            throw new TypeError(`Unknown entryType "${entryType}", please try again.`);
        }

        const logEntry = {
            event: entryType,
            entryTarget,
            roomID,
            ...extras,
            timestamp: getCurrentTime()
        };
        Logs.logs.push(logEntry);

        let LogString;
        switch(logEntry.event) {
            case "message":
                LogString = Logs.generateLogString(logEntry, `: ${logEntry.text}`);
                break;
                
            case "sync":
                LogString = Logs.generateLogString(logEntry, `: Skipped to ${logEntry.to}.`);
                break;
                
            case "error":
                LogString = Logs.generateLogString(logEntry, `: Error: ${logEntry.message}`);
                break;

            default:
                LogString = Logs.generateLogString(logEntry, Logs.formatList[logEntry.event]);
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

        for(const log of Logs.logs) {
            switch(log.event) {
                case "message":
                    output += Logs.generateLogString(log, `: ${log.text}\n`);
                    break;
                    
                case "sync":
                    output += Logs.generateLogString(log, `: Skipped to ${log.to}.\n`);
                    break;

                case "error":
                    output += Logs.generateLogString(log, `: Error: ${log.message}\n`);
                    break;

                default:
                    output += Logs.generateLogString(log, Logs.formatList[log.event], "\n");
                    break;
            }
        }

        return output.trim();
    }

    /**
     * Create a log file at logs.
     */
    static createLog = async () => {
        await fs.mkdir("logs", { recursive: true });
        let files;

        try {
            files = await fs.readdir('./logs');
        }
        catch(err) {
            console.error('Error reading folder:', err);
            return;
        }
        
        const logstring = Logs.toString();
        
        let
            logID = crypto.randomUUID(),
            fileName = `${logID}.log`,
            filePath = path.join("logs", fileName)
        ;

        while(files.includes(fileName)) {
            logID = crypto.randomUUID();
            fileName = `${logID}.log`;
        }
    
        await fs.writeFile(filePath, logstring, "utf-8");
    };
};

const shutdown = () => {
    console.log('Shutting down gracefully...');
    server.close(async () => {
        await Logs.createLog();
        console.log('All connections closed, exiting.');
        process.exit(0);
    });
}

/**
 * Returns the current time as a formatted string.
 */
const getCurrentTime = () => {
    const
        now = new Date(),
        hours = String(now.getHours()).padStart(2, '0'),
        minutes = String(now.getMinutes()).padStart(2, '0'),
        seconds = String(now.getSeconds()).padStart(2, '0'),
        day = String(now.getDate()).padStart(2, '0'),
        month = String(now.getMonth() + 1).padStart(2, '0'),
        year = now.getFullYear()
    ;

    const formatted = `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`;

    return formatted;
};

/**
 * Returns a SHA-256 hash of the given content.
 */
const sha256Hash = (content) => {
    return crypto.createHash("sha256").update(content).digest("hex");
};

const broadcastToRoom = (RoomID, message, except = null) => {
    if(!rooms[RoomID])
        return;
    
    for(const memberID of rooms[RoomID].members) {
        if(memberID === except) {
            continue;
        }

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
 *  { //Note: Server will not return anything in this type of message.  
 *      "type": "host",  
 *      "content": {  
 *          "MediaName": "helloworld.mp4",  
 *          "IsPaused": true  
 *      }  
 *  }  
 *  
 *  //server-to-admin:  
 *  {  
 *      "type": "userHost",  
 *      "content": {  
 *          "RoomID": "roomID"
 *          "MediaName": "helloworld.mp4",  
 *          "IsPaused": false,  
 *          "Host": "userID"  
 *      }  
 *  }
 *  ```
 */
const host = (ContentJSON, client, UserID) => {
    if(!utils.validateMessage(ContentJSON, { type: "test", content: { MediaName: "test", IsPaused: true }})) {
        sendError(client, `Invalid message format for ${ContentJSON.type}.`, UserID);
        return;
    }
    const isInRoom = members[UserID].In !== "";
    let RoomID = crypto.randomUUID();

    const rooms = Object.keys(rooms);
    while(rooms.includes(RoomID))
        RoomID = crypto.randomUUID();

    if(isInRoom) {
        sendError(client, `Member ${UserID} is already belong to a room.`, UserID);
        return;
    }

    members[RoomID].In = UserID;
    rooms[RoomID] = {
        currentMedia: ContentJSON.content.MediaName,
        isPaused: ContentJSON.content.IsPaused,
        host: UserID,
        mods: [],
        members: [UserID],
        messages: {}
    }

    sendAdminMessage({
        type: "userHost",
        content: {
            RoomID,
            MediaName: ContentJSON.content.MediaName,
            IsPaused: ContentJSON.content.IsPaused,
            Host: UserID
        }
    });

    Logs.addEntry(roomID, "host", UserID);
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
    const isInRoom = members[UserID].In !== "";

    if(isInRoom) {
        sendError(client, `Member ${UserID} is already belong to a room.`, UserID);
        return;
    }

    rooms[ContentJSON.content].members.push(UserID);
    members[UserID].In = ContentJSON.content;

    const currentRoom = rooms[ContentJSON.content];
    const membersObj = {};

    for(const memberID of currentRoom.members) {
        membersObj[memberID] = {
            UserName: members[memberID].UserName,
            Avt: members[memberID].Avt
        };
    }

    client.send(JSON.stringify({ type: "init", content: {
        CurrentMedia: currentRoom.MediaName,
        IsPaused: currentRoom.IsPaused,
        Mods: currentRoom.mods,
        Members: membersObj,
        Messages: currentRoom.messages
    }}));

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
    const 
        RoomID = members[UserID].In,
        isInRoom = RoomID !== ""
    ;

    if(!isInRoom) {
        sendError(client, `Member ${UserID} does not belong to a room.`, UserID);
        return;
    }
    const 
        MessageID = sha256Hash(UserID + ContentJSON.content + Object.keys(rooms[RoomID].messages).length.toString()),
        MessageObject = {
            Sender: UserID,
            Text: ContentJSON.content,
            Timestamp: getCurrentTime()
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

    const 
        RoomID = members[UserID].In,
        isInRoom = RoomID !== ""
    ;
    if(!isInRoom) {
        sendError(client, `Member ${UserID} does not belong to a room.`, UserID);
        return;
    }

    const 
        isMemberBelongToRoom = rooms[RoomID].members.includes(ContentJSON.content),
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

    const 
        RoomID = members[UserID].In,
        isInRoom = RoomID !== ""
    ;
    if(!isInRoom) {
        sendError(client, `Member ${UserID} does not belong to a room.`, UserID);
        return;
    }
        
    const
        isMemberBelongToRoom = rooms[RoomID].members.includes(ContentJSON.content),
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
    if(UserID !== rooms[RoomID].host) {
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
    if(UserID !== rooms[RoomID].host) {
        sendError(client, "Insufficient permission.", UserID);
        return;
    }

    broadcastToRoom(RoomID, ContentJSON);

    Logs.addEntry(RoomID, "sync", UserID, { to: ContentJSON.content });
};

const adminLogin = (UserID, adminClient) => {
    adminID = UserID;
    adminClient.send(JSON.stringify({
        type: "adminInit", 
        content: {
            Logs: Logs.toString(),
            Rooms: rooms,
            Members: members
        }
    }));
};

const sendAdminMessage = (JSONContent) => {
    if(adminID === "")
        return;
    
    members[adminID].Socket.send(JSON.stringify(JSONContent));
};

server.on("close", () => {
    Logs.createLog();
});

// Log creation and shutdown handling
server.on("close", Logs.createLog);

server.on('error', (err) => {
    console.error('Server error:', err);
    shutdown();
});

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    shutdown();
});

process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
    shutdown();
});

server.listen(PORT, () => {
    console.log(`Hello World! Server's running at port: ${PORT}.`);
});