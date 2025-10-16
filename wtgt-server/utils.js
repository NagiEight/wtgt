const crypto = require("crypto");

/**
 * @param {Object} a First Object.
 * @param {Object} b Second Object.
 * @returns Whether 2 objects has the same keys in them. (Order insensitive)
 */
const sameKeys = (a, b) => {
    const ka = Object.keys(a).sort();
    const kb = Object.keys(b).sort();
    return (ka.length === kb.length) && ka.every((k, i) => k === kb[i]);
};

/**
 * Get the true type of the passed in object.
 * @param {any} object 
 * @returns The true type of the object. null, array, int, float, infinities, and NaN included.
 */
const getType = (object) => {
    switch(object) {
        case null:
            return "null";
        case Infinity:
            return "Infinity";
        case -Infinity:
            return "-Infinity";
    }
    
    const type = typeof object;
    switch(true) {
        case Number.isNaN(object):
            return "NaN";
        case Array.isArray(object):
            return "array";
        case type === "number":
            if(Number.isInteger(object))
                return "int";
            else
                return "float";
        default:
            return type;
    }
};

/**
 * Perform a deep analysis on message, using sample as a control.
 * @param {any} message 
 * @param {any} sample 
 * @returns Whether the message matches with the sample.
 */
const validateMessage = (message, sample) => {
    const typeMessage = getType(message);
    const typeSample = getType(sample);

    if(typeMessage !== typeSample)
        return false;

    if(typeMessage === "array") {
        for(const item of message) 
            if(!validateMessage(item, sample[0])) 
                return false;
        
        return true;
    }

    if(typeMessage === "object") {
        if(!sameKeys(message, sample)) 
            return false;

        for(const key of Object.keys(message)) 
            if(!validateMessage(message[key], sample[key])) 
                return false;

        return true;
    }

    return true;
};

/**
 * Generate a password with the minimum length of 16.
 * @param {number} length 
 * @returns The password. Charset include alphanumeric characters and specials characters.
 */
const generatePassword = (length = 16) => {    
    const 
        alpha = "abcdefghijklmnopqstuvwxyz",
        alphaUp = alpha.toUpperCase(),
        numeric = "0123456789",
        specs = ",<.>/?;:'\"[{]}-_=+\\|!@#$%^&*()`~",
        charSet = [
            alpha,
            alphaUp,
            numeric,
            specs
        ]
    ;
    
    let output = "";

    while(output.length < length) {
        const charType = charSet[crypto.randomInt(0, charSet.length)];
        output += charType[crypto.randomInt(0, charType.length)];
    }

    return output;
};

/**
 * Returns the current time as a formatted string.
 */
const getCurrentTime = () => {
    const now = new Date(),
        hours = String(now.getHours()).padStart(2, "0"),
        minutes = String(now.getMinutes()).padStart(2, "0"),
        seconds = String(now.getSeconds()).padStart(2, "0"),
        day = String(now.getDate()).padStart(2, "0"),
        month = String(now.getMonth() + 1).padStart(2, "0"),
        year = now.getFullYear(),
        formatted = `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`
    ;

    return formatted;
};

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
            timestamp: getCurrentTime()
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

module.exports = { 
    generatePassword,
    validateMessage,
    getCurrentTime,
    Logs
};