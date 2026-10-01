import { MemberRecord, RoleRecord, VoiceRecord, PresenceRecord, GuildSyncMetadata } from "../../core/indexes/types.js";

export interface ResolvedMemberData {
    member: MemberRecord;
    roles: RoleRecord[];
    effectiveBitmask: bigint;
    syncMeta: GuildSyncMetadata;
}

export class QueryContext {
    public readonly requestId: string;
    public readonly requesterId: string;
    public readonly authorizedGuildIds: Set<string> | null;
    public readonly startedAt: number;

    private readonly memberDataCache: Map<string, ResolvedMemberData> = new Map();
    private readonly voiceDataCache: Map<string, VoiceRecord | null> = new Map();
    private presenceCache: PresenceRecord | null = null;
    private hasLoadedPresence: boolean = false;

    constructor(requestId: string, requesterId: string = "system", authorizedGuildIds: Set<string> | null = null) {
        this.requestId = requestId;
        this.requesterId = requesterId;
        this.authorizedGuildIds = authorizedGuildIds;
        this.startedAt = Date.now();
    }

    public isGuildAuthorized(guildId: string): boolean {
        if (this.authorizedGuildIds === null) {
            return true;
        }
        return this.authorizedGuildIds.has(guildId);
    }

    public getResolvedMember(guildId: string, userId: string): ResolvedMemberData | undefined {
        return this.memberDataCache.get(`${guildId}:${userId}`);
    }

    public setResolvedMember(guildId: string, userId: string, data: ResolvedMemberData): void {
        this.memberDataCache.set(`${guildId}:${userId}`, data);
    }

    public getVoiceRecord(guildId: string, userId: string): VoiceRecord | null | undefined {
        return this.voiceDataCache.get(`${guildId}:${userId}`);
    }

    public setVoiceRecord(guildId: string, userId: string, record: VoiceRecord | null): void {
        this.voiceDataCache.set(`${guildId}:${userId}`, record);
    }

    public getPresence(userId: string): PresenceRecord | null | undefined {
        if (this.hasLoadedPresence) {
            return this.presenceCache;
        }
        return undefined;
    }

    public setPresence(userId: string, presence: PresenceRecord | null): void {
        this.presenceCache = presence;
        this.hasLoadedPresence = true;
    }
}
