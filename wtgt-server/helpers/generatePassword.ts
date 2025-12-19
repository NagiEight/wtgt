import * as crypto from "crypto";

const generatePassword = (length: number = 16, previous?: string): string => {
    if(length <= 0) 
        length = 16;
    
    const alpha: string = "abcdefghijklmnopqstuvwxyz",
        ALPHA: string = alpha.toUpperCase(),
        numeric: string = "0123456789",
        specs: string = ",<.>/?;:'\"[{]}-_=+\\|!@#$%^&*()`~",
        charSet: string[] = [
            alpha,
            ALPHA,
            numeric,
            specs
        ];
    
    let output: string = "";

    while(output.length < length) {
        const charType = charSet[crypto.randomInt(0, charSet.length)];
        output += charType[crypto.randomInt(0, charType.length)];
    }

    if(output === previous)
        return generatePassword(length, previous);

    return output;
};

export default generatePassword;