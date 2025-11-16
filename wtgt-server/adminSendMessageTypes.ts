export interface adminLogin {
    type: "adminLogin",
    content: string
}

export interface adminLogout {
    type: "adminLogout"
}

export interface shutdown {
    type: "shutdown"
}