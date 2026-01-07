import fs from "fs/promises";
import path from "path";

import { existsSync } from "fs";

interface AdminProfile {
    UserName: string;
    Password: string;
}

await Promise.all([
    fs.mkdir(path.join("./admins", "queue"), { recursive: true }), 
    fs.mkdir(path.join("./admins", "approved"), { recursive: true })
]);

export const 
    /**
     * Approve a user's admin registration.
     */
    approve = async (UserName: string): Promise<string> => {
        const existence: { Exists: boolean, Approved: boolean } = exists(UserName);
        if(!existence.Exists) 
            throw new Error(`Admin ${UserName} doesn't exists.`);

        if(existence.Approved)
            throw new Error(`Admin ${UserName} has already been approved.`);

        await fs.rename(path.join("admins", "queue", `${UserName}.json`), path.join("admins", "approved", `${UserName}.json`));
        return UserName;
    },
    /**
     * Check if UserName is in the database or not.
     */
    exists = (UserName: string): { Exists: boolean, Approved: boolean } => ({ 
        Exists: existsSync(path.join("admins", "approved", `${UserName}.json`)) || existsSync(path.join("admins", "queue", `${UserName}.json`)), 
        Approved: existsSync(path.join("admins", "queue", `${UserName}.json`)) 
    }),
    /**
     * Query an admin's profile.
     */
    query = async (UserName: string): Promise<{ Profile: AdminProfile, Approved: boolean }> => {
        const existence: { Exists: boolean, Approved: boolean } = exists(UserName);
        if(!existence.Exists) 
            throw new Error(`Admin ${UserName} doesn't exists.`);

        return {
            Profile: JSON.parse(await fs.readFile(path.join("admins", existence.Approved ? "approved" : "queue", `${UserName}.json`), { encoding: "utf-8" })),
            Approved: existence.Approved
        };
    },
    /**
     * Remove an admin's profile.
     */
    remove = async (UserName: string): Promise<string> => {
        const existence: { Exists: boolean, Approved: boolean } = exists(UserName);
        if(!existence.Exists) 
            throw new Error(`Admin ${UserName} doesn't exists.`);

        await fs.rm(path.join("admins", existence.Approved ? "approved" : "queue", `${UserName}.json`), { recursive: true, force: true });
        return UserName;
    },
    /**
     * Add a new admin profile to the queue.
     */
    add = async (UserName: string, Password: string): Promise<string> => {
        const existence: { Exists: boolean, Approved: boolean } = exists(UserName);
        if(existence.Exists)
            throw new Error(`Admin ${UserName} already exists.`);

        await fs.writeFile(path.join("admins", "queue", `${UserName}.json`), JSON.stringify({
            UserName, Password
        }), { encoding: "utf-8" });
        return UserName;
    }
;