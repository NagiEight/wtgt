const crypto = require("crypto");

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

const validateMessage = (message, sample) => {
    const typeMessage = getType(message);
    const typeSample = getType(sample);

    if(typeMessage !== typeSample) 
        return false;

    if(typeMessage === "array") {
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

const generatePassword = (length = 16) => {
    length = Math.max(16, length);
    
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

module.exports = { generatePassword, validateMessage };