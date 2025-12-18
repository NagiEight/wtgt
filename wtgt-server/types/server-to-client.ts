interface info {
    type: "info";
    content: {
        RoomID: string;
    };
}

interface init {
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

interface join {
    type: "join";
    content: {
        UserID: string;
        UserName: string;
        Avt: string;
    };
}

interface message {
    type: "message";
    content: {
        MessageID: string;
        Sender: string;
        Text: string;
        Timestamp: string;
    };
}

interface election {
    type: "election";
    content: {
        MemberID: string;
    };
}

interface demotion {
    type: "demotion";
    content: {
        MemberID: string;
    };
}

interface leave {
    type: "leave";
    content: {
        MemberID: string;
    };
}

interface end {
    type: "end";
    content: undefined;
}

interface pause {
    type: "pause";
    content: {
        IsPaused: boolean;
    };
}

interface sync {
    type: "sync";
    content: {
        Timestamp: number;
    };
}

interface upload {
    type: "upload";
    content: {
        MediaName: string;
    };
}

export {
    info,
    init,
    join,
    message,
    election,
    demotion,
    leave,
    end,
    pause,
    sync,
    upload
};