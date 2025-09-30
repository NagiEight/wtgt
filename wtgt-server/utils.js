const crypto = require("crypto");

const clamp = (number, min, max = null) => {
    if(max === null) 
        [max, min] = [min, 0];

    return Math.min(Math.max(number, min), max);
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

module.exports = { generatePassword };