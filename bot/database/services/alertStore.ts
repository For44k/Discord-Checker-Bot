import { Schema, model, models, Document, Model } from "mongoose";

export interface IAlertConfig extends Document {
    guildId: string;
    channelId: string;
    createdAt: Date;
}

const alertSchema = new Schema<IAlertConfig>({
    guildId: { type: String, required: true, unique: true },
    channelId: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
}, {
    versionKey: false,
    collection: "alert_configs"
});

export const AlertModel: Model<IAlertConfig> = models.AlertConfig || model<IAlertConfig>("AlertConfig", alertSchema);

const alertCache: Map<string, string> = new Map();
let isAlertInitialized = false;

export class AlertChannelService {
    public static async init(): Promise<void> {
        try {
            const docs = await AlertModel.find({}).lean<IAlertConfig[]>();
            for (const doc of docs) {
                if (doc.guildId && doc.channelId) {
                    alertCache.set(doc.guildId, doc.channelId);
                }
            }
            isAlertInitialized = true;
        } catch (_) {}
    }

    public static getChannel(guildId: string): string | null {
        if (!isAlertInitialized) {
            AlertChannelService.init().catch(() => {});
        }
        return alertCache.get(guildId) || null;
    }

    public static getAllChannels(): { guildId: string; channelId: string }[] {
        if (!isAlertInitialized) {
            AlertChannelService.init().catch(() => {});
        }
        const result: { guildId: string; channelId: string }[] = [];
        for (const [guildId, channelId] of alertCache.entries()) {
            result.push({ guildId, channelId });
        }
        return result;
    }

    public static getAllChannelIds(): string[] {
        if (!isAlertInitialized) {
            AlertChannelService.init().catch(() => {});
        }
        return Array.from(new Set(alertCache.values()));
    }

    public static async setChannel(guildId: string, channelId: string): Promise<void> {
        alertCache.set(guildId, channelId);
        await AlertModel.updateOne(
            { guildId },
            { guildId, channelId },
            { upsert: true }
        ).catch(() => {});
    }

    public static async removeChannel(guildId: string): Promise<void> {
        alertCache.delete(guildId);
        await AlertModel.deleteOne({ guildId }).catch(() => {});
    }
}
