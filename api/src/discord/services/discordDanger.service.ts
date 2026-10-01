import { Permissions, Guild, GuildMember, Role } from "discord.js-selfbot-v13";
import { discordClientManager } from "../client/clientManager.js";
import { memberIndex } from "../../cache/MemberIndex.js";
import { MemoryCache } from "../../cache/MemoryCache.js";

const DANGEROUS_PERMISSION_KEYS = [
    "ADMINISTRATOR",
    "MANAGE_GUILD",
    "MANAGE_ROLES",
    "MANAGE_CHANNELS",
    "KICK_MEMBERS",
    "BAN_MEMBERS",
    "MANAGE_MESSAGES",
    "MANAGE_WEBHOOKS",
    "MANAGE_EMOJIS_AND_STICKERS",
    "MANAGE_THREADS",
    "MODERATE_MEMBERS",
    "MENTION_EVERYONE",
    "VIEW_AUDIT_LOG"
] as const;

const DANGEROUS_PERMISSIONS: ReadonlySet<string> = new Set(DANGEROUS_PERMISSION_KEYS);

const DANGEROUS_BITMASK: bigint = DANGEROUS_PERMISSION_KEYS.reduce((acc, key) => {
    const bits = Permissions.FLAGS[key as keyof typeof Permissions.FLAGS];
    return bits ? acc | BigInt(bits.toString()) : acc;
}, 0n);

export interface DangerRoleInfo {
    id: string;
    name: string;
    permissions: string[];
    color?: string;
    position?: number;
    holders?: number;
    memberCount?: number;
    membersCount?: number;
}

export interface GuildDangerData {
    guild: {
        id: string;
        serverId: string;
        name: string;
        icon: string | null;
        memberCount: number;
        ownerId?: string;
    };
    member: {
        id: string;
        tag: string;
        nickname: string | null;
        joinedAt: Date | null;
    };
    dangerRoles: DangerRoleInfo[];
    highestDangerRole: DangerRoleInfo | null;
    hasAdmin: boolean;
}

export interface DangerRolesResponse {
    userId: string;
    sharedServers: number;
    dangerousInServers: number;
    data: GuildDangerData[];
}

function resolveGuild(guildId: string): Guild | null {
    const ownedClient = discordClientManager.getClientForGuild(guildId);
    if (ownedClient) {
        return ownedClient.guilds.cache.get(guildId) ?? null;
    }
    for (const client of discordClientManager.getConnectedClients()) {
        const guild = client.guilds.cache.get(guildId);
        if (guild) {
            return guild;
        }
    }
    return null;
}

function getRoleIdsForUser(userId: string, guildId: string): string[] {
    const guild = resolveGuild(guildId);
    if (!guild) {
        return [];
    }
    const member = guild.members.cache.get(userId);
    if (member) {
        return member.roles.cache
            .filter((r: Role) => r.id !== guild.id)
            .map((r: Role) => r.id);
    }
    return memberIndex.getGuildsForUser(userId).get(guildId) ?? [];
}

const dangerRolesCache = new MemoryCache<DangerRolesResponse>({ ttlMs: 30000, maxEntries: 5000 });

export class DiscordDangerService {
    public invalidateUser(userId: string): void {
        dangerRolesCache.delete(userId);
    }

    public getUserDangerRoles(userId: string): DangerRolesResponse {
        const cached = dangerRolesCache.get(userId);
        if (cached) {
            return cached;
        }

        const results: GuildDangerData[] = [];
        let sharedServers = 0;

        const userGuildsMap = memberIndex.getGuildsForUser(userId);

        for (const [guildId] of userGuildsMap) {
            const guild = resolveGuild(guildId);
            if (!guild) {
                continue;
            }
            sharedServers += 1;

            const isOwner = guild.ownerId === userId;
            const bitmask = memberIndex.getUserBitmask(userId, guildId);

            if (!isOwner && bitmask !== 0n && (bitmask & DANGEROUS_BITMASK) === 0n) {
                continue;
            }

            const liveRoleIds = getRoleIdsForUser(userId, guildId);
            const member: GuildMember | undefined = guild.members.cache.get(userId);
            const dangerRoles: DangerRoleInfo[] = [];
            let hasAdmin = false;

            if (isOwner) {
                hasAdmin = true;
                dangerRoles.push({
                    id: guild.id,
                    name: "Server Owner",
                    permissions: ["ADMINISTRATOR"],
                    color: "#ffd700",
                    position: 9999,
                    holders: 1,
                    memberCount: 1,
                    membersCount: 1
                });
            }

            for (const roleId of liveRoleIds) {
                const role = guild.roles.cache.get(roleId);
                if (!role || role.id === guild.id) {
                    continue;
                }

                const dangerousPerms = (role.permissions.toArray() as string[]).filter((p) => DANGEROUS_PERMISSIONS.has(p));
                if (dangerousPerms.length > 0) {
                    if (dangerousPerms.includes("ADMINISTRATOR")) {
                        hasAdmin = true;
                    }
                    const indexedCount = memberIndex.getRoleHoldersCount(guild.id, role.id);
                    const holders = Math.max(role.members?.size || 0, indexedCount, 1);
                    dangerRoles.push({
                        id: role.id,
                        name: role.name,
                        permissions: dangerousPerms,
                        color: role.hexColor,
                        position: role.position,
                        holders,
                        memberCount: holders,
                        membersCount: holders
                    });
                }
            }

            if (dangerRoles.length > 0) {
                dangerRoles.sort((a, b) => (b.position || 0) - (a.position || 0));
                results.push({
                    guild: {
                        id: guild.id,
                        serverId: guild.id,
                        name: guild.name,
                        icon: guild.iconURL({ dynamic: true, size: 256 }),
                        memberCount: guild.memberCount,
                        ownerId: guild.ownerId
                    },
                    member: {
                        id: userId,
                        tag: member?.user?.tag || member?.user?.username || "Unknown",
                        nickname: member?.nickname || null,
                        joinedAt: member?.joinedAt || null
                    },
                    dangerRoles,
                    highestDangerRole: dangerRoles[0] || null,
                    hasAdmin
                });
            }
        }

        results.sort((a, b) => {
            if (a.hasAdmin && !b.hasAdmin) return -1;
            if (!a.hasAdmin && b.hasAdmin) return 1;
            return b.dangerRoles.length - a.dangerRoles.length;
        });

        const response: DangerRolesResponse = {
            userId,
            sharedServers,
            dangerousInServers: results.length,
            data: results
        };

        dangerRolesCache.set(userId, response);
        return response;
    }
}

export const discordDangerService = new DiscordDangerService();
export { DANGEROUS_BITMASK, resolveGuild };
