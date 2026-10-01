import { Schema, model, models, Document } from "mongoose";

export interface IPrefix extends Document {
    guildId: string;
    prefix: string;
}

const prefixSchema = new Schema<IPrefix>({
    guildId: { type: String, required: true, unique: true },
    prefix: { type: String, required: true },
});

export const PrefixModel = models.Prefix || model<IPrefix>("Prefix", prefixSchema);

const prefixCache: Map<string, string> = new Map();
const defaultPrefix: string = "+";
let initialized = false;

export class PrefixService {
    public static async init(): Promise<void> {
        try {
            const docs = await PrefixModel.find({}).lean<IPrefix[]>();
            for (const doc of docs) {
                if (doc.guildId) {
                    prefixCache.set(doc.guildId, doc.prefix || defaultPrefix);
                }
            }
            initialized = true;
        } catch (_) {}
    }

    public static async get(guildId: string): Promise<string> {
        return this.getSync(guildId);
    }

    public static getSync(guildId: string): string {
        if (!initialized) {
            PrefixService.init().catch(() => {});
        }
        return prefixCache.get(guildId) || defaultPrefix;
    }

    public static async set(guildId: string, prefix: string): Promise<void> {
        prefixCache.set(guildId, prefix);
        await PrefixModel.updateOne(
            { guildId },
            { guildId, prefix },
            { upsert: true }
        ).catch(() => {});
    }

    public static setSync(guildId: string, prefix: string): void {
        prefixCache.set(guildId, prefix);
        PrefixModel.updateOne(
            { guildId },
            { guildId, prefix },
            { upsert: true }
        ).catch(() => {});
    }
}
