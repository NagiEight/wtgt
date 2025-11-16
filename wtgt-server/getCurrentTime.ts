const getCurrentTime = (): string => {
    const now: Date = new Date(),
        hours: string = String(now.getHours()).padStart(2, "0"),
        minutes: string = String(now.getMinutes()).padStart(2, "0"),
        seconds: string = String(now.getSeconds()).padStart(2, "0"),
        day: string = String(now.getDate()).padStart(2, "0"),
        month: string = String(now.getMonth() + 1).padStart(2, "0"),
        year: number = now.getFullYear(),
        formatted: string = `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`
    ;

    return formatted;
};

export default getCurrentTime;