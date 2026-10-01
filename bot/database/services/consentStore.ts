import fs from 'fs';
import path from 'path';
import { UserConsentModel, IUserConsent } from '../models/user/ConsentModel';
import { logger } from '../../utils/logger/logger';

const CACHE_DIR = path.resolve(process.cwd(), 'bot/cache');
const FILE_PATH = path.join(CACHE_DIR, 'user_consents.json');

const consentedUsers = new Set<string>();
let initialized = false;

export class ConsentService {
    public static async init(): Promise<void> {
        if (initialized) return;

        try {
            if (fs.existsSync(FILE_PATH)) {
                const raw = fs.readFileSync(FILE_PATH, 'utf-8');
                const list = JSON.parse(raw);
                if (Array.isArray(list)) {
                    for (const id of list) {
                        if (typeof id === 'string' && id.trim()) {
                            consentedUsers.add(id.trim());
                        }
                    }
                }
            }
        } catch (e) {
            const err = e instanceof Error ? e.message : String(e);
            logger.warn(`Failed to load user consents from local cache: ${err}`);
        }

        try {
            const docs = await UserConsentModel.find({}, 'userId').lean<IUserConsent[]>();
            for (const doc of docs) {
                if (doc?.userId) {
                    consentedUsers.add(doc.userId);
                }
            }
        } catch (e) {
            const err = e instanceof Error ? e.message : String(e);
            logger.warn(`Failed to load user consents from MongoDB: ${err}`);
        }

        initialized = true;
    }

    public static isConsented(userId: string): boolean {
        if (!userId) return false;
        if (!initialized) {
            this.init().catch(() => {});
        }
        return consentedUsers.has(userId);
    }

    public static async acceptConsent(userId: string): Promise<void> {
        if (!userId) return;
        consentedUsers.add(userId);

        try {
            if (!fs.existsSync(CACHE_DIR)) {
                fs.mkdirSync(CACHE_DIR, { recursive: true });
            }
            fs.writeFileSync(FILE_PATH, JSON.stringify(Array.from(consentedUsers)), 'utf-8');
        } catch (e) {
            const err = e instanceof Error ? e.message : String(e);
            logger.warn(`Failed to write user consent to disk cache: ${err}`);
        }

        try {
            await UserConsentModel.updateOne(
                { userId },
                { userId, agreedAt: new Date(), version: 1 },
                { upsert: true }
            );
        } catch (e) {
            const err = e instanceof Error ? e.message : String(e);
            logger.warn(`Failed to persist user consent in MongoDB: ${err}`);
        }
    }

    public static async revokeConsent(userId: string): Promise<void> {
        if (!userId) return;
        consentedUsers.delete(userId);

        try {
            if (fs.existsSync(FILE_PATH)) {
                fs.writeFileSync(FILE_PATH, JSON.stringify(Array.from(consentedUsers)), 'utf-8');
            }
        } catch {}

        try {
            await UserConsentModel.deleteOne({ userId });
        } catch {}
    }
}
