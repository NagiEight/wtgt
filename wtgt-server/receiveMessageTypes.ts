interface info {
    type: "info",
    content: string
}

interface init {
    type: "init",
    content: {
        CurrentMedia: string,
        IsPaused: boolean,
        Host: string,
        Mods: string[],
        Members: {
            [MemberID: string]: {
                UserName: string,
                Avt: string
            }
        },
        Messages: {
            [MessageID: string]: {
                Sender: string,
                Text: string,
                Timestamp: string
            }
        }
    }
}

interface join {
    type: "join",
    content: {
        UserID: string, 
        UserName: string,
        Avt: string
    }
}

interface message {
    type: "message", 
    content: {
        MessageID: string,
        Sender: string,
        Text: string,
        Timestamp: string
    }
}

interface election {
    type: "election",
    content: string
}

interface demotion {
    type: "demotion",
    content: string
}

interface leave {
    type: "leave",
    content: string
}

interface end {
    type: "end"
}

interface pause {
    type: "pause",
    content: boolean
}

interface sync {
    type: "sync",
    content: number
}

interface upload {
    type: "upload",
    content: string
}