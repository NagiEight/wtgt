type getTypeResults = "string" | 
    "bigint" | 
    "boolean" | 
    "symbol" | 
    "undefined" | 
    "object" | 
    "function" | 
    "null" | 
    "Infinity" | 
    "-Infinity" | 
    "NaN" | 
    "array" | 
    "int" | 
    "float"
;

const sameKeys = (a: Object, b: object): boolean => 
    (Object.keys(a).sort().length === Object.keys(b).sort().length) && Object.keys(a).sort().every((k, i) => k === Object.keys(b).sort()[i]);

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
        case type === "number":
            if(Number.isInteger(object))
                return "int";
            else
                return "float";
        default:
            return type;
    }
};

const validateMessage = (message: any | Object | Array<any>, sample: any | Object | Array<any>): boolean => {
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
