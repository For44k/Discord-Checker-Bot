import { GuildSyncMetadata, GuildSyncStatus } from "../indexes/types.js";
import { NormalizedEvent } from "../events/types.js";

export class GuildStateManager {
    private readonly metadata: Map<string, GuildSyncMetadata> = new Map();
    private readonly syncBuffers: Map<string, NormalizedEvent[]> = new Map();
    private readonly bufferCapacities: number = 5000;

    public getSyncStatus(guildId: string): GuildSyncMetadata {
        const existing = this.metadata.get(guildId);
        if (existing) {
            return existing;
        }
        return {
            guildId,
            status: "INITIALIZING",
            lastSyncedAt: 0,
            memberCount: 0,
            generation: 0
        };
    }

    public setSyncStatus(guildId: string, status: GuildSyncStatus, memberCount: number = 0): GuildSyncMetadata {
        const existing = this.metadata.get(guildId);
        const nextGeneration = (existing?.generation ?? 0) + (status === "SYNCING" ? 1 : 0);
        const meta: GuildSyncMetadata = {
            guildId,
            status,
            lastSyncedAt: Date.now(),
            memberCount: memberCount || existing?.memberCount || 0,
            generation: nextGeneration
        };
        this.metadata.set(guildId, meta);

        if (status === "SYNCING" && !this.syncBuffers.has(guildId)) {
            this.syncBuffers.set(guildId, []);
        } else if (status !== "SYNCING") {
            this.syncBuffers.delete(guildId);
        }

        return meta;
    }

    public isSyncing(guildId: string): boolean {
        return this.metadata.get(guildId)?.status === "SYNCING";
    }

    public isReady(guildId: string): boolean {
        return this.metadata.get(guildId)?.status === "READY";
    }

    public getGeneration(guildId: string): number {
        return this.metadata.get(guildId)?.generation ?? 0;
    }

    public bufferEvent(guildId: string, event: NormalizedEvent): boolean {
        const buffer = this.syncBuffers.get(guildId);
        if (!buffer) {
            return false;
        }
        if (buffer.length >= this.bufferCapacities) {
            this.setSyncStatus(guildId, "FAILED");
            this.syncBuffers.delete(guildId);
            return false;
        }
        buffer.push(event);
        return true;
    }

    public drainBufferedEvents(guildId: string): NormalizedEvent[] {
        const buffer = this.syncBuffers.get(guildId);
        if (!buffer) {
            return [];
        }
        this.syncBuffers.delete(guildId);
        return buffer;
    }

    public removeGuild(guildId: string): void {
        this.metadata.delete(guildId);
        this.syncBuffers.delete(guildId);
    }

    public getAllGuildMetadata(): GuildSyncMetadata[] {
        return Array.from(this.metadata.values());
    }

    public clear(): void {
        this.metadata.clear();
        this.syncBuffers.clear();
    }
}

export const guildStateManager = new GuildStateManager();
