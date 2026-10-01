import mongoose from 'mongoose';
import { logger } from '../../utils/logger/logger';

let connected = false;

export async function connectDatabase(): Promise<void> {
    if (connected) return;
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        logger.warn('MONGODB_URI is not set in environment.');
        return;
    }
    try {
        await mongoose.connect(uri, {
            maxPoolSize: 50,
            minPoolSize: 10,
            socketTimeoutMS: 20000,
            serverSelectionTimeoutMS: 5000,
        });
        connected = true;
        logger.info('Connected to MongoDB with connection pool');
    } catch (err: unknown) {
        logger.error('Failed to connect to MongoDB', err);
    }
}

export { mongoose };
