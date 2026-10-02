import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IVoiceSession extends Document {
    userId: string;
    guildId: string;
    channelId: string;
    startedAt: Date;
    lastUpdated: Date;
}

const VoiceSessionSchema = new Schema<IVoiceSession>(
    {
        userId: { type: String, required: true },
        guildId: { type: String, required: true },
        channelId: { type: String, required: true },
        startedAt: { type: Date, default: Date.now },
        lastUpdated: { type: Date, default: Date.now },
    },
    {
        timestamps: true,
        collection: 'uservoiceactivesessions',
    }
);

VoiceSessionSchema.index({ userId: 1, guildId: 1 }, { unique: true });
VoiceSessionSchema.index({ guildId: 1, channelId: 1 });

export const VoiceSessionModel: Model<IVoiceSession> =
    mongoose.models.VoiceSession || mongoose.model<IVoiceSession>('VoiceSession', VoiceSessionSchema);
