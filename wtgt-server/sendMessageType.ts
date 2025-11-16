export interface host {
    type: "host",
    content: {
        MediaName: string,
        RoomType: "private" | "public",
        IsPaused: boolean
    }
}

export interface join {
    type: "join",
    content: string
}

export interface message {
    type: "message",
    content: string
}

export interface election {
    type: "election",
    content: string
}

export interface demotion {
    type: "demotion",
    content: string
}

export interface leave {
    type: "leave"
}

export interface pause {
    type: "pause",
    content: boolean
}

export interface sync {
    type: "sync",
    content: number
}

export interface upload {
    type: "upload",
    content: string
}