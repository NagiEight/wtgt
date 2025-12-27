export interface adminInit {
    type: "adminInit";
    content: {
        Logs: string;
        Rooms: {
            [roomID: string]: {
                currentMedia: string;
                host: string;
                type: "private" | "public";
                mods: string[];
                isPaused: boolean;
                messages: {
                    [messageID: string]: {
                        Sender: string;
                        Text: string;
                        Timestamp: string;
                    };
                };
            };
        };
        Members: {
            [memberID: string]: {
                UserName: string;
                In: string;
                Avt: string;
            };
        };
    };
}

export interface connection {
    type: "connection";
    content: {
        MemberID: string;
        UserName: string;
        Avt: string;
    };
}

export interface log {
    type: "log";
    content: {
        Text: string;
    };
}

export interface userHost {
    type: "userHost";
    content: {
        RoomID: string;
        MediaName: string;
        IsPaused: boolean;
        Host: string;
    };
}

export interface userJoin {
    type: "userJoin";
    content: {
        UserID: string;
        Target: string;
    };
}

export interface userElection {
    type: "userElection";
    content: {
        RoomID: string;
        Target: string;
    };
}

export interface userDemotion {
    type: "userDemotion";
    content: {
        RoomID: string;
        Target: string;
    };
}

export interface memberLeave {
    type: "memberLeave";
    content: {
        RoomID: string;
        UserID: string;
    };
}

export interface roomEnd {
    type: "roomEnd";
    content: {
        RoomID: string;
    };
}