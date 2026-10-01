import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config();

export const Config = {
    token: process.env.DISCORD_TOKEN || '',
    apiEndpoint: process.env.API_ENDPOINT || 'http://127.0.0.1:3116',
    apiSecret: process.env.API_SECRET_KEY || '',
    mongoUri: process.env.MONGODB_URI || '',
    ownerId: process.env.OWNER_ID || '1459194956517216510',
    errorWebhook: process.env.ERROR_WEBHOOK_URL || '',
};
