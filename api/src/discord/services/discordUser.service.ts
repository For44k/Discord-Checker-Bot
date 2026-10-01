import { User, Guild, GuildMember, Role } from "discord.js-selfbot-v13";
import { discordClientManager } from "../client/clientManager.js";
import { voiceCompanionRepository } from "../../database/repositories/VoiceCompanionRepository.js";
import { memberIndex } from "../../cache/MemberIndex.js";
import { stateStore } from "../../state/StateStore.js";
import { MemoryCache } from "../../cache/MemoryCache.js";
import { calculateCompatibility } from "../../analytics/calculators/durationCalculator.js";
import { resolveGuild } from "./discordDanger.service.js";

export interface SocialShipResponse {
    user1: {
        id: string;
        username: string;
        displayName: string;
        avatar: string;
        inVoice?: boolean;
    };
    user2: {
        id: string;
        username: string;
        displayName: string;
        avatar: string;
        inVoice?: boolean;
    };
    compatibility: number;
    title: string;
    sharedDurationSeconds: number;
    sharedDurationHours: number;
    sharedGuildsCount: number;
    mutualGuilds: string[];
    inSameVoice?: boolean;
}

export interface UserPresenceResult {
    status: string;
    activities: unknown[];
}

export interface GuildRoleDisplayItem {
    id: string;
    name: string;
    color?: string;
    position?: number;
    isOwnerRole?: boolean;
    holders?: number;
    memberCount?: number;
    membersCount?: number;
}

export interface UserGuildRolesEntry {
    serverId: string;
    guildId: string;
    guildName: string;
    guildIcon: string | null;
    ownerId: string;
    isOwner: boolean;
    memberCount: number;
    roles: GuildRoleDisplayItem[];
    roleCount: number;
    status: string;
    lastSyncedAt: number;
}

export interface ExtendedUserProfile {
    userId: string;
    username: string;
    discriminator: string;
    globalName: string | null;
    tag: string;
    avatar: string | null;
    avatarDecoration: string | null;
    banner: string | null;
    accentColor: number | null;
    hexAccentColor: string | null;
    bio: string | null;
    pronouns: string | null;
    connectedAccounts: unknown[];
    badges: unknown[];
    premiumSince: string | null;
    premiumGuildSince: string | null;
    mutualGuilds: Array<{ id: string; name: string; icon: string | null }>;
    createdTimestamp: number;
}

interface RawProfilePayload {
    user?: {
        avatar_decoration_data?: { asset?: string };
        accent_color?: number;
        bio?: string;
    };
    user_profile?: {
        pronouns?: string;
    };
    banner?: string;
    bio?: string;
    pronouns?: string;
    connected_accounts?: unknown[];
    badges?: unknown[];
    premium_since?: string;
    premium_guild_since?: string;
    mutual_guilds?: Array<{ id: string; name: string; icon: string | null }>;
}

const profileCache = new MemoryCache<ExtendedUserProfile | null>({ ttlMs: 60000, maxEntries: 5000 });
const userFetchCache = new MemoryCache<User | null>({ ttlMs: 120000, maxEntries: 10000 });
const rolesCache = new MemoryCache<UserGuildRolesEntry[]>({ ttlMs: 30000, maxEntries: 5000 });

export class DiscordUserService {
    public invalidateUser(userId: string): void {
        userFetchCache.delete(userId);
        profileCache.delete(userId);
        rolesCache.delete(userId);
    }

    private async fetchUser(userId: string): Promise<User | null> {
        const cached = userFetchCache.get(userId);
        if (cached) return cached;

        const fetched = await discordClientManager.executeWithFailover(async (client) => {
            return client.users.cache.get(userId) || (await client.users.fetch(userId));
        }).catch(() => null);

        if (fetched) {
            userFetchCache.set(userId, fetched);
        }
        return fetched;
    }

    public async getSocialShip(user1Id: string, user2Id: string): Promise<SocialShipResponse | null> {
        const [user1, user2] = await Promise.all([this.fetchUser(user1Id), this.fetchUser(user2Id)]);
        if (!user1 || !user2) return null;

        const u1GuildMap = memberIndex.getGuildsForUser(user1Id);
        const u2GuildMap = memberIndex.getGuildsForUser(user2Id);
        const mutualGuildNames: string[] = [];

        if (u1GuildMap.size > 0 && u2GuildMap.size > 0) {
            for (const [guildId] of u1GuildMap) {
                if (u2GuildMap.has(guildId)) {
                    const guild = resolveGuild(guildId);
                    mutualGuildNames.push(guild?.name || guildId);
                }
            }
        } else {
            const seen = new Set<string>();
            for (const client of discordClientManager.getConnectedClients()) {
                for (const guild of client.guilds.cache.values()) {
                    if (!seen.has(guild.id) && guild.members.cache.has(user1Id) && guild.members.cache.has(user2Id)) {
                        seen.add(guild.id);
                        mutualGuildNames.push(guild.name);
                    }
                }
            }
        }

        const u1VoiceMap = stateStore.getUserVoiceChannel(user1Id);
        const u2VoiceMap = stateStore.getUserVoiceChannel(user2Id);
        let u1InVoice = u1VoiceMap.size > 0;
        let u2InVoice = u2VoiceMap.size > 0;
        let inSameVoice = false;

        for (const [gId, ch1] of u1VoiceMap) {
            if (u2VoiceMap.get(gId) === ch1) {
                inSameVoice = true;
                break;
            }
        }

        if (!inSameVoice && (!u1InVoice || !u2InVoice)) {
            outer: for (const client of discordClientManager.getConnectedClients()) {
                for (const guild of client.guilds.cache.values()) {
                    const vs1 = guild.voiceStates?.cache?.get(user1Id);
                    const vs2 = guild.voiceStates?.cache?.get(user2Id);
                    if (vs1?.channelId) u1InVoice = true;
                    if (vs2?.channelId) u2InVoice = true;
                    if (vs1?.channelId && vs2?.channelId && vs1.channelId === vs2.channelId) {
                        inSameVoice = true;
                        break outer;
                    }
                }
            }
        }

        const sharedDurationSeconds = await voiceCompanionRepository.getPairSharedDuration(user1Id, user2Id).catch(() => 0);
        const sharedDurationHours = parseFloat((sharedDurationSeconds / 3600).toFixed(2));
        const { score: compatibility, rankTitle: title } = calculateCompatibility(
            user1Id,
            user2Id,
            sharedDurationSeconds,
            mutualGuildNames.length
        );

        return {
            user1: {
                id: user1.id,
                username: user1.username,
                displayName: (user1 as { displayName?: string }).displayName || user1.username,
                avatar: user1.displayAvatarURL ? user1.displayAvatarURL({ dynamic: true, size: 512 }) : "",
                inVoice: u1InVoice
            },
            user2: {
                id: user2.id,
                username: user2.username,
                displayName: (user2 as { displayName?: string }).displayName || user2.username,
                avatar: user2.displayAvatarURL ? user2.displayAvatarURL({ dynamic: true, size: 512 }) : "",
                inVoice: u2InVoice
            },
            compatibility,
            title,
            sharedDurationSeconds,
            sharedDurationHours,
            sharedGuildsCount: mutualGuildNames.length,
            mutualGuilds: mutualGuildNames,
            inSameVoice
        };
    }

    public async getUserPresence(userId: string): Promise<UserPresenceResult> {
        const userGuildsMap = memberIndex.getGuildsForUser(userId);
        let bestPresence: UserPresenceResult = { status: "offline", activities: [] };

        const guildIds =
            userGuildsMap.size > 0
                ? Array.from(userGuildsMap.keys())
                : discordClientManager.getConnectedClients().flatMap((c) => Array.from(c.guilds.cache.keys()));

        for (const guildId of guildIds) {
            const guild = resolveGuild(guildId);
            const member = guild?.members.cache.get(userId);
            if (member?.presence) {
                const status = member.presence.status || "offline";
                const activities = member.presence.activities || [];
                if (status !== "offline") {
                    return { status, activities };
                }
                bestPresence = { status, activities };
            }
        }

        return bestPresence;
    }

    public async getUserRolesAcrossGuilds(userId: string): Promise<UserGuildRolesEntry[]> {
        const cached = rolesCache.get(userId);
        if (cached) return cached;

        const results: UserGuildRolesEntry[] = [];
        const userGuildsMap = memberIndex.getGuildsForUser(userId);

        for (const [guildId, indexedRoleIds] of userGuildsMap) {
            const guild = resolveGuild(guildId);
            if (!guild) continue;

            const isOwner = guild.ownerId === userId;
            const member: GuildMember | undefined = guild.members.cache.get(userId);

            const liveRoles: GuildRoleDisplayItem[] = member
                ? member.roles.cache
                      .filter((r: Role) => r.id !== guild.id)
                      .sort((a: Role, b: Role) => b.position - a.position)
                      .map((r: Role) => {
                          const indexedCount = memberIndex.getRoleHoldersCount(guild.id, r.id);
                          const holders = Math.max(r.members?.size || 0, indexedCount, 1);
                          return {
                              id: r.id,
                              name: r.name,
                              color: r.hexColor,
                              position: r.position,
                              holders,
                              memberCount: holders,
                              membersCount: holders
                          };
                      })
                : indexedRoleIds
                      .map((rid) => {
                          const r = guild.roles.cache.get(rid);
                          const indexedCount = memberIndex.getRoleHoldersCount(guild.id, rid);
                          const holders = Math.max(r?.members?.size || 0, indexedCount, 1);
                          return r
                              ? {
                                    id: r.id,
                                    name: r.name,
                                    color: r.hexColor,
                                    position: r.position,
                                    holders,
                                    memberCount: holders,
                                    membersCount: holders
                                }
                              : {
                                    id: rid,
                                    name: "Unknown",
                                    holders,
                                    memberCount: holders,
                                    membersCount: holders
                                };
                      })
                      .sort((a, b) => (b.position ?? 0) - (a.position ?? 0));

            const roles: GuildRoleDisplayItem[] = isOwner
                ? [
                      {
                          id: `owner-${guild.id}`,
                          name: "Server Owner",
                          color: "#ffd700",
                          position: 999999,
                          isOwnerRole: true,
                          holders: 1,
                          memberCount: 1,
                          membersCount: 1
                      },
                      ...liveRoles
                  ]
                : liveRoles;

            const syncMeta = memberIndex.getSyncStatus(guild.id);

            results.push({
                serverId: guild.id,
                guildId: guild.id,
                guildName: guild.name,
                guildIcon: guild.iconURL({ dynamic: true, size: 256 }),
                ownerId: guild.ownerId,
                isOwner,
                memberCount: guild.memberCount,
                roles,
                roleCount: liveRoles.length,
                status: syncMeta.status,
                lastSyncedAt: syncMeta.lastSyncedAt
            });
        }

        results.sort((a, b) => {
            if (a.isOwner && !b.isOwner) return -1;
            if (!a.isOwner && b.isOwner) return 1;
            return b.roleCount - a.roleCount;
        });

        rolesCache.set(userId, results);
        return results;
    }

    public async getUserProfile(userId: string): Promise<ExtendedUserProfile | null> {
        return profileCache.getOrFetch(userId, async () => {
            const user = await this.fetchUser(userId);
            if (!user) return null;

            let profile: RawProfilePayload | null = null;
            try {
                const userWithProfile = user as unknown as { getProfile?: () => Promise<RawProfilePayload> };
                if (typeof userWithProfile.getProfile === "function") {
                    profile = await discordClientManager
                        .executeWithFailover(async () => {
                            if (userWithProfile.getProfile) {
                                return userWithProfile.getProfile();
                            }
                            return null;
                        })
                        .catch(() => null);
                }
            } catch (err) {
                console.warn(`[DiscordUserService] Could not fetch extended profile for ${userId}:`, err);
            }

            const userWithExt = user as unknown as {
                globalName?: string | null;
                accentColor?: number | null;
                hexAccentColor?: string | null;
                avatarDecorationURL?: (options?: { size?: number }) => string | null;
                bannerURL?: (options?: { dynamic?: boolean; size?: number }) => string | null;
            };

            return {
                userId: user.id,
                username: user.username,
                discriminator: user.discriminator,
                globalName: userWithExt.globalName ?? null,
                tag: user.tag,
                avatar: user.displayAvatarURL ? user.displayAvatarURL({ dynamic: true, size: 512 }) : null,
                avatarDecoration: userWithExt.avatarDecorationURL
                    ? userWithExt.avatarDecorationURL({ size: 512 })
                    : profile?.user?.avatar_decoration_data?.asset
                    ? `https://cdn.discordapp.com/avatar-decoration-presets/${profile.user.avatar_decoration_data.asset}.png?size=512`
                    : null,
                banner: userWithExt.bannerURL
                    ? userWithExt.bannerURL({ dynamic: true, size: 1024 })
                    : profile?.banner
                    ? `https://cdn.discordapp.com/banners/${user.id}/${profile.banner}.png?size=1024`
                    : null,
                accentColor: userWithExt.accentColor || profile?.user?.accent_color || null,
                hexAccentColor: userWithExt.hexAccentColor || null,
                bio: profile?.bio || profile?.user?.bio || null,
                pronouns: profile?.pronouns || profile?.user_profile?.pronouns || null,
                connectedAccounts: profile?.connected_accounts || [],
                badges: profile?.badges || [],
                premiumSince: profile?.premium_since || null,
                premiumGuildSince: profile?.premium_guild_since || null,
                mutualGuilds: Array.isArray(profile?.mutual_guilds)
                    ? profile.mutual_guilds.map((g) => ({ id: g.id, name: g.name, icon: g.icon }))
                    : [],
                createdTimestamp: user.createdTimestamp
            };
        });
    }
}

export const discordUserService = new DiscordUserService();
