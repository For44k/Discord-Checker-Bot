import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISyncCheckpointDocument extends Document {
    guildId: string;
    status: string;
    memberCount: number;
    generation: number;
    lastSyncedAt: number;
    checksum?: string;
}

const SyncCheckpointSchema = new Schema<ISyncCheckpointDocument>(
    {
        guildId: { type: String, required: true, unique: true, index: true },
        status: { type: String, required: true },
        memberCount: { type: Number, default: 0 },
        generation: { type: Number, default: 0 },
        lastSyncedAt: { type: Number, default: Date.now },
        checksum: { type: String, required: false }
    },
    {
        timestamps: false,
        versionKey: false
    }
);

export const SyncCheckpointModel: Model<ISyncCheckpointDocument> =
    mongoose.models.SyncCheckpoint || mongoose.model<ISyncCheckpointDocument>("SyncCheckpoint", SyncCheckpointSchema);
