export interface adminLogin {
    type: "adminLogin";
    content: {
        Password: string;
    };
}

export interface adminLogout {
    type: "adminLogout";
}

export interface shutdown {
    type: "shutdown";
}