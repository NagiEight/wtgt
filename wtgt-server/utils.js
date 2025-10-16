const crypto = require("crypto"),
    fs = require("fs/promises"),
    path = require("path")
;

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

module.exports = { 
    generatePassword,
    validateMessage,
    getCurrentTime
};