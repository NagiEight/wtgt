export interface host {
    type: "host";
    content: {
        MediaName: string;
        RoomType: "private" | "public";
        IsPaused: boolean;
    };
}

export interface join {
    type: "join";
    content: {
        RoomID: string;
    };
}

export interface message {
    type: "message";    
    content: {
        Text: string;
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