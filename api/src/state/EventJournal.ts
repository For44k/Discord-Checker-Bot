import fs from "node:fs";
import path from "node:path";

export interface JournalEvent {
    eventId: string;
    userId: string;
    guildId: string;
    channelId: string | null;
    type: "join" | "move" | "leave";
    occurredAt: number;
}

export class EventJournal {
    private readonly filePath: string;
    private queue: Promise<void> = Promise.resolve();

    constructor(filePath = process.env.VOICE_EVENT_JOURNAL || "./data/voice-events.ndjson") {
        this.filePath = path.resolve(filePath);
        try {
            fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
            if (!fs.existsSync(this.filePath)) {
                fs.writeFileSync(this.filePath, "", "utf8");
            }
        } catch (err) {
            console.warn("[EventJournal] Failed to initialize directory:", err);
        }
    }

    public append(event: JournalEvent): Promise<void> {
        const line = JSON.stringify(event) + "\n";
        this.queue = this.queue.then(async () => {
            await fs.promises.appendFile(this.filePath, line, "utf8");
        });
        return this.queue;
    }

    public async readAll(): Promise<JournalEvent[]> {
        await this.queue;
        try {
            if (!fs.existsSync(this.filePath)) return [];
            const stat = await fs.promises.stat(this.filePath).catch(() => null);
            if (!stat || stat.size === 0) return [];
            if (stat.size > 20 * 1024 * 1024) {
                await fs.promises.truncate(this.filePath, 0);
                return [];
            }
            const raw = await fs.promises.readFile(this.filePath, "utf8");
            const out: JournalEvent[] = [];
            for (const line of raw.split("\n")) {
                if (!line.trim()) continue;
                try {
                    out.push(JSON.parse(line));
                } catch {}
            }
            return out;
        } catch (err) {
            console.error("[EventJournal] Read error:", err);
            return [];
        }
    }

    public async compactProcessed(processedIds: Set<string>): Promise<void> {
        if (!processedIds || processedIds.size === 0) return;
        this.queue = this.queue.then(async () => {
            try {
                if (!fs.existsSync(this.filePath)) return;
                const stat = await fs.promises.stat(this.filePath).catch(() => null);
                if (!stat || stat.size === 0) return;
                if (stat.size > 20 * 1024 * 1024) {
                    await fs.promises.truncate(this.filePath, 0);
                    return;
                }
                const raw = await fs.promises.readFile(this.filePath, "utf8");
                const keep: string[] = [];
                for (const line of raw.split("\n")) {
                    if (!line.trim()) continue;
                    try {
                        const e = JSON.parse(line) as JournalEvent;
                        if (!processedIds.has(e.eventId)) {
                            keep.push(JSON.stringify(e));
                        }
                    } catch {
                        keep.push(line);
                    }
                }
                const tmp = `${this.filePath}.tmp`;
                await fs.promises.writeFile(tmp, keep.length ? keep.join("\n") + "\n" : "", "utf8");
                await fs.promises.rename(tmp, this.filePath);
            } catch (err) {
                console.error("[EventJournal] Compaction error:", err);
            }
        });
        await this.queue;
    }
}

export const eventJournal = new EventJournal();
