import { PresenceRecord } from "./types.js";

export class PresenceIndex {
    private readonly presences: Map<string, PresenceRecord> = new Map();

    public setPresence(record: PresenceRecord): void {
        this.presences.set(record.userId, record);
    }

    public getPresence(userId: string): PresenceRecord | null {
        return this.presences.get(userId) ?? null;
    }

    public removePresence(userId: string): boolean {
        return this.presences.delete(userId);
    }

    public clear(): void {
        this.presences.clear();
    }

    public size(): number {
        return this.presences.size;
    }
}

export const presenceIndex = new PresenceIndex();
