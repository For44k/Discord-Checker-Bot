export type GuildSyncStatus =
    | "INITIALIZING"
    | "SYNCING"
    | "READY"
    | "STALE"
    | "FAILED"
    | "UNAVAILABLE";

export type ApiResultStatus =
    | "MEMBER_FOUND"
    | "MEMBER_NOT_FOUND"
    | "NOT_INDEXED"
    | "STALE"
    | "PARTIAL"
    | "UNAVAILABLE"
    | "NOT_AUTHORIZED"
    | "ERROR";

export type ConnectionAuthStatus =
    | "AUTHORIZED"
    | "NOT_AUTHORIZED"
    | "UNAVAILABLE"
    | "ERROR";

export interface MemberRecord {
    guildId: string;
    userId: string;
    roleIds: string[];
    rolesBitfield: string;
    joinedTimestamp: number;
    updatedAt: number;
    version: number;
    generation: number;
}

export interface RoleRecord {
    guildId: string;
    roleId: string;
    name: string;
    color: string;
    position: number;
    permissions: string;
    managed: boolean;
    version: number;
    deleted: boolean;
    updatedAt: number;
}

export interface VoiceRecord {
    guildId: string;
    userId: string;
    channelId: string;
    observedJoinedAt: number;
    selfMute: boolean;
    selfDeaf: boolean;
    serverMute: boolean;
    serverDeaf: boolean;
    selfVideo: boolean;
    selfStream: boolean;
    updatedAt: number;
}

export type ClientPlatformStatus = "online" | "idle" | "dnd" | "offline" | "unknown";

export interface PresenceRecord {
    userId: string;
    status: ClientPlatformStatus;
    desktop: ClientPlatformStatus;
    mobile: ClientPlatformStatus;
    web: ClientPlatformStatus;
    lastObservedAt: number;
}

export interface GuildSyncMetadata {
    guildId: string;
    status: GuildSyncStatus;
    lastSyncedAt: number;
    memberCount: number;
    generation: number;
}
