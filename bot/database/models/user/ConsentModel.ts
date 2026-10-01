import { Schema, model, models, Document } from 'mongoose';

export interface IUserConsent extends Document {
    userId: string;
    agreedAt: Date;
    version: number;
}

const consentSchema = new Schema<IUserConsent>({
    userId: { type: String, required: true, unique: true, index: true },
    agreedAt: { type: Date, default: Date.now },
    version: { type: Number, default: 1 },
});

export const UserConsentModel = models.UserConsent || model<IUserConsent>('UserConsent', consentSchema);
