import { VoiceRecord } from "./types.js";

export class VoiceIndex {
    private readonly voiceStatesByGuild: Map<string, Map<string, VoiceRecord>> = new Map();

    public setVoiceState(record: VoiceRecord): void {
        let guildMap = this.voiceStatesByGuild.get(record.guildId);
        if (!guildMap) {
            guildMap = new Map();
            this.voiceStatesByGuild.set(record.guildId, guildMap);
        }
        guildMap.set(record.userId, record);
    }

    public getVoiceState(guildId: string, userId: string): VoiceRecord | null {
        return this.voiceStatesByGuild.get(guildId)?.get(userId) ?? null;
    }

    public removeVoiceState(guildId: string, userId: string): boolean {
        const guildMap = this.voiceStatesByGuild.get(guildId);
        if (!guildMap) {
            return false;
        }
        const removed = guildMap.delete(userId);
        if (guildMap.size === 0) {
            this.voiceStatesByGuild.delete(guildId);
        }
        return removed;
    }

    public getGuildVoiceStates(guildId: string): VoiceRecord[] {
        const guildMap = this.voiceStatesByGuild.get(guildId);
        if (!guildMap) {
            return [];
        }
        return Array.from(guildMap.values());
    }

    public removeGuild(guildId: string): void {
        this.voiceStatesByGuild.delete(guildId);
    }

    public clear(): void {
        this.voiceStatesByGuild.clear();
    }

    public totalActiveVoiceStates(): number {
        let total = 0;
        for (const guildMap of this.voiceStatesByGuild.values()) {
            total += guildMap.size;
        }
        return total;
    }
}

export const voiceIndex = new VoiceIndex();
