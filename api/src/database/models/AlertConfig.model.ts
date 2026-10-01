import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAlertConfigDoc extends Document {
    guildId: string;
    channelId: string;
    createdAt: Date;
}

const alertConfigSchema = new Schema<IAlertConfigDoc>({
    guildId: { type: String, required: true, unique: true },
    channelId: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
}, {
    versionKey: false,
    collection: 'alert_configs',
});

export const AlertConfigModel: Model<IAlertConfigDoc> =
    mongoose.models.AlertConfig || mongoose.model<IAlertConfigDoc>('AlertConfig', alertConfigSchema);
