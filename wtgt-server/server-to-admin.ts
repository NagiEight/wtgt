interface adminInit {
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

interface connection {
    type: "connection";
    content: {
        MemberID: string;
        UserName: string;
        Avt: string;
    };
}

interface log {
    type: "log";
    content: {
        Text: string;
    };
}

interface userHost {
    type: "userHost";
    content: {
        RoomID: string;
        MediaName: string;
        IsPaused: boolean;
        Host: string;
    };
}

interface userJoin {
    type: "userJoin";
    content: {
        UserID: string;
        Target: string;
    };
}

interface userElection {
    type: "userElection";
    content: {
        RoomID: string;
        Target: string;
    };
}

interface userDemotion {
    type: "userDemotion";
    content: {
        RoomID: string;
        Target: string;
    };
}

interface memberLeave {
    type: "memberLeave";
    content: {
        RoomID: string;
        UserID: string;
    };
}

interface roomEnd {
    type: "roomEnd";
    content: {
        RoomID: string;
    };
}

export {
    adminInit,
    log,
    userHost,
    userJoin,
    userElection,
    userDemotion,
    memberLeave,
    roomEnd,
    connection
};