import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IVoiceCompanion extends Document {
    userId: string;
    companionId: string;
    guildId: string;
    sharedDurationSeconds: number;
    lastSeen: Date;
    createdAt: Date;
    updatedAt: Date;
}

const VoiceCompanionSchema = new Schema<IVoiceCompanion>(
    {
        userId: { type: String, required: true },
        companionId: { type: String, required: true },
        guildId: { type: String, required: true },
        sharedDurationSeconds: { type: Number, default: 0 },
        lastSeen: { type: Date, default: Date.now },
    },
    {
        timestamps: true,
        collection: 'uservoicecompanions',
    }
);

VoiceCompanionSchema.index({ userId: 1, companionId: 1, guildId: 1 }, { unique: true });
VoiceCompanionSchema.index({ userId: 1, sharedDurationSeconds: -1 });
VoiceCompanionSchema.index({ userId: 1, guildId: 1, sharedDurationSeconds: -1 });

export const VoiceCompanionModel: Model<IVoiceCompanion> =
    mongoose.models.VoiceCompanion || mongoose.model<IVoiceCompanion>('VoiceCompanion', VoiceCompanionSchema);
