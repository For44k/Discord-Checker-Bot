import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMemberDocument extends Document {
    guildId: string;
    userId: string;
    roleIds: string[];
    rolesBitfield: string;
    joinedAt: number;
    updatedAt: number;
    version: number;
}

const MemberSchema = new Schema<IMemberDocument>(
    {
        guildId: { type: String, required: true },
        userId: { type: String, required: true },
        roleIds: { type: [String], default: [] },
        rolesBitfield: { type: String, default: "0" },
        joinedAt: { type: Number, default: Date.now },
        updatedAt: { type: Number, default: Date.now },
        version: { type: Number, default: 1 }
    },
    {
        timestamps: false,
        versionKey: false
    }
);

MemberSchema.index({ guildId: 1, userId: 1 }, { unique: true });
MemberSchema.index({ userId: 1, guildId: 1 });

export const MemberModel: Model<IMemberDocument> = mongoose.models.Member || mongoose.model<IMemberDocument>("Member", MemberSchema);
