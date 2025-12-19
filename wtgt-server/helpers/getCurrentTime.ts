const formatOridinal = (number: number): string => {
    const PR: Intl.PluralRules = new Intl.PluralRules("en-US", { type: "ordinal" });
    const suffixes: Map<string, string> = new Map([
        ["one", "st"],
        ["two", "nd"],
        ["few", "rd"],
        ["other", "th"],
    ]);
    const rule: Intl.LDMLPluralRule = PR.select(number);
    const suffix: string = suffixes.get(rule);
    return `${number}${suffix}`;
};

const getCurrentTime = (): string => {
    const now: Date = new Date(),
        monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ],
        hours: number = now.getHours(),
        minutes: number = now.getMinutes(),
        seconds: number = now.getSeconds(),
        day: number = now.getDate(),
        month: number = now.getMonth(),
        year: number = now.getFullYear(),
        formatted: string = `${monthNames[month]} ${formatOridinal(day)} ${year} ${hours <= 12 ? hours : hours - 12}:${minutes}:${seconds} ${hours < 12 ? "a.m." : "p.m."}`;
    return formatted;
};

export default getCurrentTime;