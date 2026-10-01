import { Schema, model, models, Document } from 'mongoose';

export interface IPerm extends Document {
    guildId: string;
    roles: string[];
    users: string[];
}

const permSchema = new Schema<IPerm>({
    guildId: { type: String, required: true, unique: true },
    roles: { type: [String], default: [] },
    users: { type: [String], default: [] },
});

export const PermModel = models.Perm || model<IPerm>('Perm', permSchema);

interface GuildPerms {
    roles: string[];
    users: string[];
}

const permsCache: Map<string, GuildPerms> = new Map();
let initialized = false;

export class PermissionService {
    public static async init(): Promise<void> {
        try {
            const docs = await PermModel.find({}).lean<IPerm[]>();
            for (const doc of docs) {
                const guildId = doc.guildId;
                if (guildId) {
                    permsCache.set(guildId, {
                        roles: doc.roles || [],
                        users: doc.users || []
                    });
                }
            }
            initialized = true;
        } catch (_) {}
    }

    private static getEntry(guildId: string): GuildPerms {
        if (!initialized) {
            PermissionService.init().catch(() => {});
        }
        let entry = permsCache.get(guildId);
        if (!entry) {
            entry = { roles: [], users: [] };
            permsCache.set(guildId, entry);
        }
        return entry;
    }

    public static getRoles(guildId: string): string[] {
        return [...PermissionService.getEntry(guildId).roles];
    }

    public static getUsers(guildId: string): string[] {
        return [...PermissionService.getEntry(guildId).users];
    }

    public static async setRole(guildId: string, roleId: string): Promise<void> {
        const entry = PermissionService.getEntry(guildId);
        if (!entry.roles.includes(roleId)) {
            entry.roles.push(roleId);
        }
        await PermModel.updateOne(
            { guildId },
            { $addToSet: { roles: roleId } },
            { upsert: true }
        );
    }

    public static async removeRole(guildId: string, roleId: string): Promise<void> {
        const entry = PermissionService.getEntry(guildId);
        entry.roles = entry.roles.filter(r => r !== roleId);
        await PermModel.updateOne(
            { guildId },
            { $pull: { roles: roleId } }
        );
    }

    public static async setUser(guildId: string, userId: string): Promise<void> {
        const entry = PermissionService.getEntry(guildId);
        if (!entry.users.includes(userId)) {
            entry.users.push(userId);
        }
        await PermModel.updateOne(
            { guildId },
            { $addToSet: { users: userId } },
            { upsert: true }
        );
    }

    public static async removeUser(guildId: string, userId: string): Promise<void> {
        const entry = PermissionService.getEntry(guildId);
        entry.users = entry.users.filter(u => u !== userId);
        await PermModel.updateOne(
            { guildId },
            { $pull: { users: userId } }
        );
    }

    public static isAuthorized(guildId: string, userId: string, memberRoles: string[]): boolean {
        const entry = PermissionService.getEntry(guildId);
        if (entry.roles.length === 0 && entry.users.length === 0) return false;
        if (entry.users.includes(userId)) return true;
        if (entry.roles.length > 0 && memberRoles.some(r => entry.roles.includes(r))) return true;
        return false;
    }
}
