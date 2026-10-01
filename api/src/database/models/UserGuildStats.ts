import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUserGuildStats extends Document {
    userId: string;
    guildId: string;
    guildName?: string;
    durationSeconds: number;
    messageCount: number;
    sessionCount: number;
    lastSeen: Date;
    createdAt: Date;
    updatedAt: Date;
}

const UserGuildStatsSchema = new Schema<IUserGuildStats>(
    {
        userId: { type: String, required: true },
        guildId: { type: String, required: true },
        guildName: { type: String, default: null },
        durationSeconds: { type: Number, default: 0 },
        messageCount: { type: Number, default: 0 },
        sessionCount: { type: Number, default: 0 },
        lastSeen: { type: Date, default: Date.now },
    },
    {
        timestamps: true,
        collection: 'uservoicehistories',
    }
);

UserGuildStatsSchema.index({ userId: 1, guildId: 1 }, { unique: true });
UserGuildStatsSchema.index({ guildId: 1, durationSeconds: -1 });
UserGuildStatsSchema.index({ userId: 1, durationSeconds: -1 });
UserGuildStatsSchema.index({ userId: 1, lastSeen: -1 });
UserGuildStatsSchema.index({ guildId: 1, userId: 1 });

export const UserGuildStatsModel: Model<IUserGuildStats> =
    mongoose.models.UserGuildStats || mongoose.model<IUserGuildStats>('UserGuildStats', UserGuildStatsSchema);
