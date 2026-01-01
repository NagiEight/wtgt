export interface adminLogin {
    type: "adminLogin";
    content: {
        UserName: string;
        Password: string;
    };
}

export interface adminLogout {
    type: "adminLogout";
}

export interface shutdown {
    type: "shutdown";
}

export interface register {
    type: "register";
    content: {
        UserName: string;
        Password: string;
    };
}