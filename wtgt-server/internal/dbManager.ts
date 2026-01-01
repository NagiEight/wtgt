import fs from "fs/promises";
import path from "path";

import { existsSync } from "fs";

interface AdminProfile {
    UserName: string;
    Password: string;
}

export const 
    /**
     * Approve a user's admin registration.
     */
    approve = async (UserName: string): Promise<string> => {
        const existence: { Exists: boolean, Approved: boolean } = exists(UserName);
        if(!existence.Exists) 
            throw new Error(`Admin ${UserName} doesn't exists.`);

        if(existence.Approved)
            throw new Error(`Admin ${UserName} has already been approved.`)

        await fs.rename(path.join("admins", "queue", UserName), path.join("admins", "approved", UserName));
        return UserName;
    },
    /**
     * Check if UserName is in the database or not.
     */
    exists = (UserName: string): { Exists: boolean, Approved: boolean } => ({ 
        Exists: existsSync(path.join("admins", "approved", UserName)) || existsSync(path.join("admins", "queue", UserName)), 
        Approved: existsSync(path.join("admins", "queue", UserName)) 
    }),
    /**
     * Query an admin's profile.
     */
    query = async (UserName: string): Promise<{ Profile: AdminProfile, Approved: boolean }> => {
        const existence: { Exists: boolean, Approved: boolean } = exists(UserName);
        if(!existence.Exists) 
            throw new Error(`Admin ${UserName} doesn't exists.`);

        return {
            Profile: JSON.parse(await fs.readFile(path.join("admins", existence.Approved ? "approved" : "queue", UserName), { encoding: "utf-8" })),
            Approved: existence.Approved
        };
    },
    remove = async (UserName: string): Promise<string> => {
        const existence: { Exists: boolean, Approved: boolean } = exists(UserName);
        if(!existence.Exists) 
            throw new Error(`Admin ${UserName} doesn't exists.`);

        await fs.rm(path.join("admins", existence.Approved ? "approved" : "queue", UserName), { recursive: true, force: true });
        return UserName;
    }
;