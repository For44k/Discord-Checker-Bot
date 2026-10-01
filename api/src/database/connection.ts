import mongoose, { ConnectOptions } from 'mongoose';
import { config } from '../utils/env.config.js';

const poolOptions: ConnectOptions = {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 20000,
    maxPoolSize: 20,
    minPoolSize: 2,
};

let connectionPromise: Promise<typeof mongoose> | null = null;

export async function connectDatabase(): Promise<typeof mongoose> {
    if (mongoose.connection.readyState === 1) {
        return mongoose;
    }

    if (connectionPromise) {
        return connectionPromise;
    }

    connectionPromise = mongoose.connect(config.MONGODB_URI, poolOptions);

    try {
        return await connectionPromise;
    } catch (error) {
        connectionPromise = null;
        throw error;
    }
}

export function isDatabaseConnected(): boolean {
    return mongoose.connection.readyState === 1;
}

export async function disconnectDatabase(): Promise<void> {
    if (mongoose.connection.readyState === 0) {
        return;
    }

    connectionPromise = null;
    await mongoose.disconnect();
}
