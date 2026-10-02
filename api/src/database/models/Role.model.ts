import mongoose, { Schema, Document, Model } from "mongoose";

export interface IRoleDocument extends Document {
    guildId: string;
    roleId: string;
    name: string;
    color: string;
    position: number;
    permissions: string;
    managed: boolean;
    version: number;
    updatedAt: number;
}

const RoleSchema = new Schema<IRoleDocument>(
    {
        guildId: { type: String, required: true },
        roleId: { type: String, required: true },
        name: { type: String, required: true },
        color: { type: String, default: "#000000" },
        position: { type: Number, default: 0 },
        permissions: { type: String, default: "0" },
        managed: { type: Boolean, default: false },
        version: { type: Number, default: 1 },
        updatedAt: { type: Number, default: Date.now }
    },
    {
        timestamps: false,
        versionKey: false
    }
);

RoleSchema.index({ guildId: 1, roleId: 1 }, { unique: true });

export const RoleModel: Model<IRoleDocument> = mongoose.models.Role || mongoose.model<IRoleDocument>("Role", RoleSchema);
