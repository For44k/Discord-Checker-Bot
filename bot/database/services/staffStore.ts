import { Schema, model, models, Document } from 'mongoose';

export interface IStaffRole extends Document {
    guildId: string;
    roles: string[];
}

const staffSchema = new Schema<IStaffRole>({
    guildId: { type: String, required: true, unique: true },
    roles: { type: [String], default: [] },
});

export const StaffModel = models.StaffRole || model<IStaffRole>('StaffRole', staffSchema);

const cache = new Map<string, string[]>();
let loaded = false;

export class StaffService {
    public static async ensureLoaded(): Promise<void> {
        if (loaded) return;
        try {
            const docs = await StaffModel.find({}).lean<IStaffRole[]>();
            for (const doc of docs) {
                if (doc.guildId) {
                    cache.set(doc.guildId, doc.roles || []);
                }
            }
        } catch { }
        loaded = true;
    }

    public static loadStaffRoles(guildId: string): string[] {
        if (!loaded) this.ensureLoaded();
        const r = cache.get(guildId);
        return Array.isArray(r) ? [...r] : [];
    }

    public static saveStaffRoles(guildId: string, roles: string[]): void {
        const arr = Array.isArray(roles) ? roles : [];
        cache.set(guildId, arr);
        StaffModel.updateOne(
            { guildId },
            { guildId, roles: arr },
            { upsert: true }
        ).catch(() => { });
    }
}
