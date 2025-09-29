const
    http = require("http"),
    ws = require("ws"),
    crypto = require("crypto"),
    fs = require("fs/promises"),
    path = require("path")
;

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
        UserID = crypto.randomUUID()
    ;

    if(Object.keys(members).includes(UserID)) {
        return;
    }
    
    client.send(JSON.stringify({
        type: "info",
        content: UserID
    }));

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
        const ContentJSON = JSON.parse(message.toString());
        const isInRoom = members[UserID].In !== "";

        switch(ContentJSON.type) {
            case "host": 
                if(!validateMessage(ContentJSON.content, { MediaName: "test", IsPaused: true })) {
                    sendError(client, `Invalid message format for ${ContentJSON.type}.`);
                    break;
                }

                if(!isInRoom) {
                    members[UserID].In = UserID;
                    rooms[UserID] = {
                        currentMedia: ContentJSON.content.MediaName,
                        isPaused: ContentJSON.content.IsPaused,
                        mods: [],
                        members: [UserID],
                        messages: {}
                    }
                }
                else {
                    sendError(client, `Member ${UserID} is already belong to a room.`);
                }

                break;
            case "join":
                if(!validateMessage(ContentJSON.content, "test")) {
                    sendError(client, `Invalid message format for ${ContentJSON.type}.`);
                    break;
                }

                if(!Object.keys(rooms).includes(ContentJSON.content)) {
                    sendError(client, `Unknown room ${ContentJSON.content}.`);
                    return;
                }

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
                    });
                }
                else {
                    sendError(client, `Member ${UserID} is already belong to a room.`);
                }
                break;
            case "sync":
                if(!validateMessage(ContentJSON.content, 1)) {
                    sendError(client, `Invalid message format for ${ContentJSON.type}.`);
                    break;
                }

                if(UserID === members[UserID].In) {
                    broadcastToRoom(members[UserID].In, ContentJSON);
                    Logs.addEntry(members[UserID].In, "sync", UserID, { to: ContentJSON.content });
                }
                else {
                    sendError(client, "Insufficient permission.");
                }
                break;
        }
    });
});

const shutdown = () => {
    console.log('Shutting down gracefully...');
    server.close(() => {
        createLog();
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

const broadcastToRoom = (RoomID, message) => {
    if(!rooms[RoomID])
        return;
    
    rooms[RoomID].members.forEach(memberID => {
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