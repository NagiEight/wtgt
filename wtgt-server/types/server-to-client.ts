export interface info {
    type: "info";
    content: {
        RoomID: string;
    };
}

export interface init {
    type: "init";
    content: {
        CurrentMedia: string;
        IsPaused: boolean;
        Host: string;
        Mods: string[];
        Members: {
            [MemberID: string]: {
                UserName: string;
                Avt: string;
            };
        };
        Messages: {
            [MessageID: string]: {
                Sender: string;
                Text: string;
                Timestamp: string;
            };
        };
    };
}

export interface join {
    type: "join";
    content: {
        UserID: string;
        UserName: string;
        Avt: string;
    };
}

export interface message {
    type: "message";
    content: {
        MessageID: string;
        Sender: string;
        Text: string;
        Timestamp: string;
    };
}

export interface election {
    type: "election";
    content: {
        Target: string;
    };
}

export interface demotion {
    type: "demotion";
    content: {
        Target: string;
    };
}

export interface leave {
    type: "leave";
    content: {
        MemberID: string;
    };
}

export interface end {
    type: "end";
    content: undefined;
}

export interface pause {
    type: "pause";
    content: {
        IsPaused: boolean;
    };
}

export interface sync {
    type: "sync";
    content: {
        Timestamp: number;
    };
}

export interface upload {
    type: "upload";
    content: {
        MediaName: string;
    };
}

export interface error {
    type: "error";
    content: {
        Message: string;
    }
}

export interface disconnect {
    type: "disconnect";
    content: {
        MemberID: string;
    };
}

export interface newMember {
    type: "newMember";
    content: {
        MemberID: string;
        UserName: string;
        Avt: string;
    };
}

export interface signal {
    type: "signal";
    content: {
        ICECandidate: string;
        SDPMID: string;
        SDPMLineIndex: number;
    }
}

export interface queryResult {
    type: "queryResult";
    content: {
        [RoomID: string]: {
            CurrentMedia: string;
            Host: string;
            Type: "public";
            IsPaused: boolean;
            Mods: string[];
            Members: string[];
            Messages: {
                [MessageID: string]: {
                    Sender: string;
                    Text: string;
                    Timestamp: string;
                };
            };
        };
    };
}