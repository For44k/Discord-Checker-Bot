import fs from "fs";
import path from "path";

const CACHE_DIR = path.resolve(process.cwd(), "bot/cache");
const FILE_PATH = path.join(CACHE_DIR, "voice_lock.json");

export interface VoiceLockData {
    [guildId: string]: string;
}

export class VoiceLockStore {
    private static cache: VoiceLockData = {};
    private static initialized = false;
    private static saveTimer: NodeJS.Timeout | null = null;

    private static ensureInit() {
        if (this.initialized) return;
        try {
            if (fs.existsSync(FILE_PATH)) {
                const raw = fs.readFileSync(FILE_PATH, "utf-8");
                this.cache = JSON.parse(raw);
            } else {
                this.cache = {};
            }
        } catch {
            this.cache = {};
        }
        this.initialized = true;
    }

    private static scheduleSave() {
        if (this.saveTimer) return;
        this.saveTimer = setTimeout(async () => {
            this.saveTimer = null;
            try {
                if (!fs.existsSync(CACHE_DIR)) {
                    await fs.promises.mkdir(CACHE_DIR, { recursive: true });
                }
                await fs.promises.writeFile(FILE_PATH, JSON.stringify(this.cache, null, 2), "utf-8");
            } catch {}
        }, 100);
    }

    public static getChannel(guildId: string): string | null {
        this.ensureInit();
        return this.cache[guildId] || null;
    }

    public static setChannel(guildId: string, channelId: string): void {
        this.ensureInit();
        this.cache[guildId] = channelId;
        this.scheduleSave();
    }

    public static removeChannel(guildId: string): void {
        this.ensureInit();
        delete this.cache[guildId];
        this.scheduleSave();
    }

    public static getAll(): VoiceLockData {
        this.ensureInit();
        return { ...this.cache };
    }
}
