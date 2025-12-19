type getTypeResults = 
    | "string" 
    | "bigint" 
    | "boolean" 
    | "symbol" 
    | "undefined" 
    | "object" 
    | "function" 
    | "null" 
    | "Infinity" 
    | "-Infinity" 
    | "NaN" 
    | "array" 
    | "number";

const sameKeys = (a: Object, b: object): boolean => {
    const ka: string[] = Object.keys(a).sort();
    const kb: string[] = Object.keys(b).sort();
    return ka.length === kb.length && ka.every((k, i) => k === kb[i]);
}

const getType = (object: any): getTypeResults => {
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
        default:
            return type;
    }
};

const validateMessage = (message: any, sample: any): boolean => {
    const typeMessage = getType(message);
    const typeSample = getType(sample);

    if(typeMessage !== typeSample)
        return false;

    if(typeMessage === "array") {
        if(sample.length === 0)
            return Array.isArray(message);

        for(const item of message) {
            if(!validateMessage(item, sample[0])) {
                return false;
            }
        }
    }

    if(typeMessage === "object") {
        if(!sameKeys(message, sample)) 
            return false;

        for(const key of Object.keys(message)) {
            if(!validateMessage(message[key], sample[key])) {
                return false;
            }
        }
    }

    return true;
};

export default validateMessage;
