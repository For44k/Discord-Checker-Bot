import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProcessedEvent extends Document {
    eventId: string;
    createdAt: Date;
}

const ProcessedEventSchema = new Schema<IProcessedEvent>(
    {
        eventId: { type: String, required: true, unique: true },
        createdAt: { type: Date, default: Date.now, expires: '7d' },
    },
    {
        versionKey: false,
        collection: 'processed_events',
    }
);

export const ProcessedEventModel: Model<IProcessedEvent> =
    mongoose.models.ProcessedEvent || mongoose.model<IProcessedEvent>('ProcessedEvent', ProcessedEventSchema);
