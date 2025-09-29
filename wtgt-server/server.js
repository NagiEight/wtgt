//Imports
const
    http = require("http"),
    ws = require("ws"),
    crypto = require("crypto"),
    fs = require("fs/promises"),
    path = require("path")
;

//Constants
const
    PORT = 3000,
    rooms = {
        /**
         *  roomID (will be the same as the host's id): {
         *      currentMedia: "medianame.mp4",
         *      mods: [],
         *      members: [...memberIDs],
         *      isPaused: false,
         *      messages: {
         *          messageID: {
         *              Sender: memberID,
         *              Text: "hello world!",
         *              Timestamp: somethingsomething
         *          }
         *      }
         *  }
         */
    },
    members = {
        /**
         *  MemberID: {
         *      UserName: "Claire Iidea",
         *      In: roomID,
         *      Socket: wsObj,
         *      Avt: <byteString>
         *  }
        */
    },
    server = http.createServer((req, res) => {

    }),
    wss = new ws.Server({ server })
;

wss.on("connection", (client, req) => {
    const
        url = new URL(req.url, `ws://${req.headers.host}`),
        userProfile = {
            UserName: url.searchParams.get("UserName"), 
            Avt: url.searchParams.get("Avt")
        },
        IP = req.socket.remoteAddress,
        UserID = crypto.randomUUID()
    ;

    if(Object.keys(members).includes(UserID)) {
        return;
    }
    
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
    }

    client.on("close", () => {
        Logs.addEntry("", "disconnection", UserID);
        delete members[UserID];
    });


    client.on("message", (message) => {
        let ContentJSON;
        try {
            ContentJSON = JSON.parse(message.toString());
        }
        catch {
            sendError(client, "Invalid JSON message sent, try again.")
            return;
        }

        switch(ContentJSON.type) {
            /**
             *  { //Note: Server will not return anything in this type of message.
             *      "type": "host",
             *      "content": {
             *          "MediaName": "helloworld.mp4",
             *          "IsPaused": true
             *      }
             *  }
             */
            case "host":
                host(ContentJSON, client, UserID);
                break;

            /** //client-to-server:
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
             *  { //this one is for the other members of the room
             *      "type": "join",
             *      "content": {
             *          "UserID": "UserID",
             *          "UserName": "Claire Iidea",
             *          "Avt": "avt"
             *      }
             *  }
             */
            case "join":
                join(ContentJSON, client, UserID);
                break;

            /** //client-to-server:
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
             */
            case "message":
                sendMessage(ContentJSON, client, UserID);;
                break;

            /**
             *  {
             *      "type": "election",
             *      "content": "UserID"
             *  }
             */
            case "election":
                election(ContentJSON, client, UserID);
                break;
            
            /** //client-to-server:
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
             */
            case "leave":
                leave(client, UserID);
                break;
            
            /**
             *  {
             *      "type": "pause",
             *      "content": false
             *  }
             */
            case "pause":
                pause(ContentJSON, client, UserID);
                break;

            /**
             *  {
             *      "type": "sync",
             *      "content": 69420
             *  }
             */
            case "sync":
                sync(ContentJSON, client, UserID);
                break;

            default:
                sendError(client, `Unknown request type: ${ContentJSON.type}`);
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
        host: " hosted a new room.",
        join: " joined.",
        leave: " left.",
        pause: " paused.",
        error: ""
    };
    
    static generateLogString = (logEntry, suffix) => {
        return `{${logEntry.roomID}}[${logEntry.timestamp}] ${logEntry.entryTarget}${suffix}\n`;
    };
    
    /**
     * Add a new entry to the logs.
     */
    static addEntry = (roomID, entryType, entryTarget, extras = {}) => {
        const allowedEntryType = [
            "connection",
            "disconnection",
            "election",
            "host",
            "message",
            "join",
            "leave",
            "pause",
            "sync",
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

        if(logEntry.event === "message") {
            console.log(Logs.generateLogString(logEntry, `: ${logEntry.text}`));
        }
        else if(logEntry.event === "sync") {
            console.log(Logs.generateLogString(logEntry, `: Skipped to ${logEntry.to}.`));
        }
        else {
            console.log(Logs.generateLogString(logEntry, Logs.formatList[logEntry.event]));
        }
    }

    static toString = () => {
        let output = "";

        Logs.logs.forEach(log => {
            if(log.event === "message") {
                output += Logs.generateLogString(log, `: ${log.text}`);
            }
            else if(logEntry.event === "sync") {
                output += Logs.generateLogString(logEntry, `: Skipped to ${logEntry.to}.`)
            }
            else {
                output += Logs.generateLogString(log, Logs.formatList[log.event]);
            }
        });

        return output.trim();
    }

    /**
     * Create a log file at logs.
     */
    static createLog = async () => {
        await fs.mkdir("logs", { recursive: true });
    
        const logstring = Logs.toString();
    
        let
            logID = sha256Hash(getCurrentTime()),
            fileName = `${logID}.log`,
            filePath = path.join("logs", fileName),
            counter = 1
        ;
    
        while(true) {
            try {
                await fs.access(filePath);
    
                fileName = `${logID}_${counter}.log`;
                filePath = path.join("logs", fileName);
                ++counter;
            }
            catch {
                break;
            }
        }
    
        await fs.writeFile(filePath, logstring, "utf-8");
    };
};

const shutdown = () => {
    console.log('Shutting down gracefully...');
    server.close(() => {
        Logs.createLog();
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

    rooms[RoomID].members.forEach(memberID => {
        if(memberID === except) {
            return;
        }
        const member = members[memberID];
        if(member && member.socket) {
            if(member.socket.readyState === ws.OPEN) {
                member.Socket.send(JSON.stringify(message));
            }
        }
    });
};

const sendError = (client, message) => {
    client.send(JSON.stringify({
        type: "error",
        content: message
    }));
};

const validateMessage = (message, sample) => {
    const typeMessage = getType(message);
    const typeSample = getType(sample);

    if(typeMessage !== typeSample) 
        return false;

    if(typeMessage === "array") {
        if(sample.length === 0) 
            return Array.isArray(message);

        for(const item of message) {
            if(!validateMessage(item, sample[0])) 
                return false;
        }
        return true;
    }

    if(typeMessage === "object") {
        if(!sameKeys(message, sample)) 
            return false;

        for(const key of Object.keys(message)) {
            if(!validateMessage(message[key], sample[key])) 
                return false;
        }
        return true;
    }

    return typeMessage === typeSample;
};

const sameKeys = (a, b) => {
    const ka = Object.keys(a).sort();
    const kb = Object.keys(b).sort();
    return ka.length === kb.length && ka.every((k, i) => k === kb[i]);
};

const getType = (object) => {
    if(object === null)
        return "null";
    if(Array.isArray(object))
        return "array";
    return typeof object;
};

server.listen(PORT, () => {
    console.log(`Hello World! Server's running at port: ${PORT}.`);
});

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

const host = (ContentJSON, client, UserID) => {
    if(!validateMessage(ContentJSON.content, { MediaName: "test", IsPaused: true })) {
        sendError(client, `Invalid message format for ${ContentJSON.type}.`);
        return;
    }
    const isInRoom = members[UserID].In !== "";

    if(!isInRoom) {
        members[UserID].In = UserID;
        rooms[UserID] = {
            currentMedia: ContentJSON.content.MediaName,
            isPaused: ContentJSON.content.IsPaused,
            mods: [],
            members: [UserID],
            messages: {}
        }
        Logs.addEntry(UserID, "host", UserID);
    }
    else {
        sendError(client, `Member ${UserID} is already belong to a room.`);
    }
};

const join = (ContentJSON, client, UserID) => {
    if(!validateMessage(ContentJSON.content, "test")) {
        sendError(client, `Invalid message format for ${ContentJSON.type}.`);
        return;
    }

    if(!Object.keys(rooms).includes(ContentJSON.content)) {
        sendError(client, `Unknown room ${ContentJSON.content}.`);
        return;
    }
    const isInRoom = members[UserID].In !== "";

    if(!isInRoom) {
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

        client.send(JSON.stringify({type: "init", content: {
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
                UserName: userProfile["UserName"],
                Avt: userProfile["Avt"]
            }
        }, UserID);
        Logs.addEntry(members[UserID].In, "join", UserID);
    }
    else {
        sendError(client, `Member ${UserID} is already belong to a room.`);
    }
};

const sendMessage = (ContentJSON, client, UserID) => {
    if(!validateMessage(ContentJSON.content, "test")) {
        sendError(client, `Invalid message format for ${ContentJSON.type}.`);
        return;
    }
    const isInRoom = members[UserID].In !== "";

    if(isInRoom) {
        const MessageID = sha256Hash(UserID + ContentJSON.content + Object.keys(rooms[members[UserID].In].messages).length.toString());
        const MessageObject = {
            Sender: UserID,
            Text: ContentJSON.content,
            Timestamp: getCurrentTime()
        };
            
        rooms[members[UserID].In].messages[MessageID] = MessageObject;

        broadcastToRoom(members[UserID].In, {
            type: "message",
            content: {
                MessageID,
                MessageObject
            }
        });

        Logs.addEntry(members[UserID].In, "message", UserID, { text: ContentJSON.content });
    }
    else {
        sendError(client, `Member ${UserID} does not belong to a room.`);
    }
};

const election = (ContentJSON, client, UserID) => {
    if(!validateMessage(ContentJSON.content, "test")) {
        sendError(client, `Invalid message format for ${ContentJSON.type}.`);
        return;
    }

    const isMemberBelongToRoom = rooms[members[UserID].In].members.includes(ContentJSON.content);
    const isMemberAMod = rooms[members[UserID].In].mods.includes(ContentJSON.content);
    const isMemberHasPermission = members[UserID].In == UserID;

    if(isMemberBelongToRoom && !isMemberAMod && isMemberHasPermission) {
        rooms[members[UserID].In].mods.push(ContentJSON.content);

        broadcastToRoom(members[UserID].In, ContentJSON);
        Logs.addEntry(members[UserID].In, "election", ContentJSON.content);
    }
    else if(isMemberHasPermission) {
        sendError(client, `Insufficient permission.`);
    }
    else if(isMemberAMod) {
        sendError(client, `Member ${ContentJSON.content} is already a moderator.`);
    }
    else {
        sendError(client, `Unknown member ${ContentJSON.content}: Member does not exist or does not belong to this room.`);
    }
};

const leave = (client, UserID) => {
    const isInRoom = members[UserID].In !== "";
    if(isInRoom) {
        if(UserID === members[UserID].In) {
            broadcastToRoom(members[UserID].In, {type: "end"});
            const RoomID = members[UserID].In;

            for(const MemberID of rooms[members[UserID].In].members) {
                members[MemberID].In = "";
            }

            delete rooms[RoomID];
        }
        else {
            rooms[members[UserID].In].members = rooms[members[UserID].In].members.filter(member => member !== UserID);
            broadcastToRoom(members[UserID].In, {type: "leave", content: UserID});
            members[UserID].In = "";
            Logs.addEntry(members[UserID].In, "leave", UserID);
        }
    }
    else {
        sendError(client, `Member ${UserID} does not belong to a room.`);
    }
};

const pause = (ContentJSON, client, UserID) => {
    if(!validateMessage(ContentJSON.content, true)) {
        sendError(client, `Invalid message format for ${ContentJSON.type}.`);
        return;
    }

    if(UserID === members[UserID].In) {
        rooms[members[UserID].In].isPaused = ContentJSON.content;
        broadcastToRoom(members[UserID].In, ContentJSON);
        Logs.addEntry(members[UserID].In, "pause", UserID);
    }
    else {
        sendError(client, "Insufficient permission.");
    }
};

const sync = (ContentJSON, client, UserID) => {
    if(!validateMessage(ContentJSON.content, 1)) {
        sendError(client, `Invalid message format for ${ContentJSON.type}.`);
        return;
    }

    if(UserID === members[UserID].In) {
        broadcastToRoom(members[UserID].In, ContentJSON);
        Logs.addEntry(members[UserID].In, "sync", UserID, { to: ContentJSON.content });
    }
    else {
        sendError(client, "Insufficient permission.");
    }
};