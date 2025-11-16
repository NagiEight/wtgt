const resolveBadFileName = (fileName: string, replacer: string = "_"): string => {
    const lastDotIndex: number = fileName.lastIndexOf(".");
    let name: string;
    let extension: string;
    
    if (lastDotIndex > 0 && lastDotIndex !== fileName.length - 1) {
        name = fileName.slice(0, lastDotIndex);
        extension = fileName.slice(lastDotIndex);
    }
    else {
        name = fileName;
        extension = "";
    }

    name = name
        .replace(/[\x00-\x1F\x7F]/g, replacer)
        .replace(/[<>:"/\\|?*]/g, replacer)
        .replace(/\0/g, replacer)
        .trim()
        .replace(new RegExp(`${replacer}+`, "g"), replacer)
        .replace(/\.+$/g, "")
    ;

    if(name.length === 0) 
        name = "untitled";

    return name + extension;
};

export default resolveBadFileName;