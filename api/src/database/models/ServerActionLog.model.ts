import mongoose, { Schema, Document, Model } from "mongoose";

export interface IServerActionLog extends Document {
    serverId: string;
    serverName?: string;
    action: string;
    userId?: string;
    userTag?: string;
    targetId?: string;
    targetTag?: string;
    details?: unknown;
    timestamp: Date;
}

const serverActionLogSchema = new Schema<IServerActionLog>(
    {
        serverId: { type: String, required: true, index: true },
        serverName: { type: String },
        action: { type: String, required: true, index: true },
        userId: { type: String },
        userTag: { type: String },
        targetId: { type: String },
        targetTag: { type: String },
        details: { type: Schema.Types.Mixed },
        timestamp: { type: Date, default: Date.now, expires: "30d" }
    },
    { strict: false, versionKey: false }
);

serverActionLogSchema.index({ serverId: 1, timestamp: -1 });
serverActionLogSchema.index({ executorId: 1, timestamp: -1 });
serverActionLogSchema.index({ targetId: 1, timestamp: -1 });

export const ServerActionLogModel: Model<IServerActionLog> =
    mongoose.models.ServerActionLog || mongoose.model<IServerActionLog>("ServerActionLog", serverActionLogSchema);
