export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    [key: string]: unknown;
}

export interface ServerRoleItem {
    id: string;
    name: string;
    permissions?: string[] | null;
    color?: number;
    position?: number;
    hoist?: boolean;
    icon?: string | null;
}

export interface UserServerData {
    guildId: string;
    guildName: string;
    guildIcon?: string | null;
    ownerId?: string | null;
    ownerTag?: string;
    memberCount?: string | number;
    isOwner?: boolean;
    roles: ServerRoleItem[];
    dangerRoles?: ServerRoleItem[];
    [key: string]: unknown;
}

export interface UserRolesResponse {
    success: boolean;
    data: UserServerData[];
}

export interface DangerRoleItem {
    id: string;
    name: string;
    permissions: string[];
}

export interface DangerServerData {
    guildId: string;
    guildName: string;
    dangerRoles: DangerRoleItem[];
    isOwner?: boolean;
    [key: string]: unknown;
}

export interface DangerRolesResponse {
    success: boolean;
    userId: string;
    dangerCount: number;
    servers: DangerServerData[];
}

export interface UserVoiceMatch {
    guildId: string;
    guildName: string;
    channelId: string;
    channelName: string;
    selfMute: boolean;
    selfDeaf: boolean;
    serverMute: boolean;
    serverDeaf: boolean;
    streaming: boolean;
}

export interface UserVoiceResponse {
    success: boolean;
    userId: string;
    inVoice: boolean;
    matches: UserVoiceMatch[];
}

export interface VoiceLeaderboardUserEntry {
    top: number;
    userId: string;
    guildId: string;
    guildName: string | null;
    durationSeconds: number;
    durationHours: number;
    sessionCount: number;
    messageCount: number;
    lastSeen?: Date | string;
}

export interface VoiceLeaderboardServerEntry {
    top: number;
    guildId: string;
    guildName: string;
    totalHours: number;
    activeUsers: number;
}

export interface VoiceLeaderboardResponse {
    success: boolean;
    guildId?: string;
    limit: number;
    data: (VoiceLeaderboardUserEntry | VoiceLeaderboardServerEntry)[];
}

export interface UserPresenceActivity {
    name: string;
    type: number | string;
    details?: string;
    state?: string;
}

export interface UserPresenceResponse {
    success: boolean;
    userId: string;
    status: string;
    clientStatus?: {
        desktop?: string;
        mobile?: string;
        web?: string;
    };
    activities?: UserPresenceActivity[];
}

export interface SocialShipData {
    shipPercentage?: number;
    compatibility?: number;
    title?: string;
    comment?: string;
    commonGuilds?: string[];
    commonVoiceTimeSeconds?: number;
    mutualFriendsCount?: number;
    sharedDurationSeconds?: number;
    sharedDurationHours?: number;
    sharedGuildsCount?: number;
    mutualGuilds?: string[];
    inSameVoice?: boolean;
    user1?: {
        id: string;
        username: string;
        displayName?: string;
        avatar?: string | null;
        inVoice?: boolean;
    };
    user2?: {
        id: string;
        username: string;
        displayName?: string;
        avatar?: string | null;
        inVoice?: boolean;
    };
}

export interface SocialShipResponse {
    success: boolean;
    data?: SocialShipData;
    [key: string]: unknown;
}

export interface ServerInfoData {
    id: string;
    name: string;
    icon: string | null;
    banner: string | null;
    ownerId: string;
    ownerAvatar?: string | null;
    ownerCreatedAt?: Date | string | null;
    ownerLastOnline?: Date | string | null;
    ownerOnlineStatus?: string | null;
    ownerBoostingServer?: boolean;
    memberCount: number;
    channelCount: number;
    totalChannels?: number;
    totalCategories?: number;
    voiceMembersCount?: number;
    roleCount: number;
    highestRole?: {
        id: string;
        name: string;
        position?: number;
        color?: string;
    } | null;
    highestRoleHolders?: Array<{ id: string; tag: string }>;
    firstUserJoined?: { id: string; joinedAt: Date | string | null } | null;
    lastUserJoined?: { id: string; joinedAt: Date | string | null } | null;
    emojiCount: number;
    stickerCount: number;
    boostLevel: number;
    boostCount: number;
    createdAt: Date | string;
    features: string[];
    vanityURL: string | null;
    description: string | null;
}

export interface ServerInfoResponse {
    success: boolean;
    data: ServerInfoData;
}

export interface ServerAdminMember {
    id: string;
    user: {
        id: string;
        username: string;
        discriminator: string;
        tag: string;
        avatar: string | null;
    };
    roles: Array<{
        id: string;
        name: string;
        permissions: string[];
    }>;
    highestRole: {
        id: string;
        name: string;
        position: number;
    };
    isOwner: boolean;
    joinedAt: Date | string | null;
}

export interface ServerAdminsResponse {
    success: boolean;
    serverId: string;
    totalAdmins: number;
    admins: ServerAdminMember[];
}

export interface ServerBotMember {
    id: string;
    user: {
        id: string;
        username: string;
        discriminator: string;
        tag: string;
        avatar: string | null;
    };
    roles: Array<{
        id: string;
        name: string;
    }>;
    isOwner: boolean;
}

export interface ServerBotsResponse {
    success: boolean;
    serverId: string;
    totalBots: number;
    bots: ServerBotMember[];
}

export interface ServerRoleWithIcon {
    id: string;
    name: string;
    iconUrl: string | null;
    color: string | number;
    position: number;
    permissions: string[];
}

export interface ServerRolesResponse {
    success: boolean;
    serverId: string;
    totalRoles: number;
    roles: ServerRoleWithIcon[];
}

export interface ServerEmojiItem {
    id: string;
    name: string;
    animated: boolean;
    url: string;
}

export interface ServerEmojisResponse {
    success: boolean;
    serverId: string;
    totalEmojis: number;
    emojis: ServerEmojiItem[];
}

export interface ServerStickerItem {
    id: string;
    name: string;
    format: string;
    url: string;
}

export interface ServerStickersResponse {
    success: boolean;
    serverId: string;
    totalStickers: number;
    stickers: ServerStickerItem[];
}

export interface ServerActionLogEntry {
    serverId: string;
    executorId: string;
    executorTag?: string;
    targetId?: string;
    targetTag?: string;
    actionType: string;
    reason?: string;
    changes?: Record<string, unknown>;
    timestamp: Date | string;
}

export interface ServerLogsResponse {
    success: boolean;
    serverId?: string;
    logs: ServerActionLogEntry[];
}

export type WsEventType =
    | 'CACHE_INVALIDATE'
    | 'VOICE_UPDATE'
    | 'ROLE_ALERT'
    | 'DANGER_ALERT'
    | 'PRESENCE_UPDATE'
    | 'PING'
    | 'PONG';

export interface WsCacheInvalidatePayload {
    path?: string;
    key?: string;
    target?: string;
    timestamp: number;
}

export interface WsVoiceUpdatePayload {
    userId: string;
    guildId: string;
    channelId: string | null;
    timestamp: number;
}

export interface WsRoleAlertPayload {
    guildId: string;
    guildName?: string;
    userId: string;
    userTag?: string;
    userAvatar?: string;
    isBot?: boolean;
    roleId: string;
    roleName?: string;
    action: 'added' | 'removed';
    isDangerous: boolean;
    permissions?: string[];
    executorInfo?: string;
    timestamp: number;
}

export interface WsDangerAlertPayload {
    userId: string;
    guildId: string;
    guildName?: string;
    dangerousPermissions: string[];
    roles: string[];
    timestamp: number;
}

export interface WsMessage<T = unknown> {
    type: WsEventType;
    payload: T;
    timestamp: number;
}
