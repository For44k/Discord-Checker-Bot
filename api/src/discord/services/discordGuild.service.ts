import { discordClientManager } from "../client/clientManager.js";
import { SingleFlight } from "../../utils/singleFlight.js";
import { MemoryCache } from "../../cache/MemoryCache.js";
import { Guild, GuildMember } from "discord.js-selfbot-v13";

export interface UserBoostInfo {
    guildId: string;
    guildName: string;
    guildIcon: string | null;
    premiumSince: Date;
    boostSince: Date;
    memberCount: number;
    boostCount: number;
    tier: number;
    ownerId: string | null;
}

const guildCache = new MemoryCache<Guild>({ ttlMs: 300000, maxEntries: 1000 });
const singleFlight = new SingleFlight();

export class DiscordGuildService {
    public getUserBoosts(userId: string): { userId: string; boosts: UserBoostInfo[] } {
        const clients = discordClientManager.getConnectedClients();
        const seenGuildIds = new Set<string>();
        const boosts: UserBoostInfo[] = [];

        for (const client of clients) {
            for (const guild of client.guilds.cache.values()) {
                if (seenGuildIds.has(guild.id)) continue;
                seenGuildIds.add(guild.id);

                const member: GuildMember | undefined = guild.members.cache.get(userId);
                if (member?.premiumSince) {
                    boosts.push({
                        guildId: guild.id,
                        guildName: guild.name,
                        guildIcon: guild.iconURL({ dynamic: true, size: 256 }),
                        premiumSince: member.premiumSince,
                        boostSince: member.premiumSince,
                        memberCount: guild.memberCount || guild.members.cache.size,
                        boostCount: guild.premiumSubscriptionCount || 0,
                        tier: guild.premiumTier === "TIER_3" ? 3 : (guild.premiumTier === "TIER_2" ? 2 : (guild.premiumTier === "TIER_1" ? 1 : 0)),
                        ownerId: guild.ownerId || null
                    });
                }
            }
        }

        return { userId, boosts };
    }

    public async resolveGuild(guildId: string): Promise<Guild | null> {
        const cached = guildCache.get(guildId);
        if (cached && cached.available) {
            return cached;
        }

        const guildClient = discordClientManager.getClientForGuild(guildId);
        if (guildClient) {
            const cachedGuild = guildClient.guilds.cache.get(guildId);
            if (cachedGuild && cachedGuild.available) {
                guildCache.set(guildId, cachedGuild);
                return cachedGuild;
            }
        }

        try {
            const guild = await singleFlight.do(`guild:${guildId}`, async () => {
                return discordClientManager.executeWithFailover(async (client) => {
                    return client.guilds.fetch(guildId);
                });
            });

            if (guild && guild.available) {
                guildCache.set(guildId, guild);
                return guild;
            }
        } catch (err) {
            console.warn(`[DiscordGuildService] Could not resolve guild ${guildId}:`, err);
        }

        return null;
    }

    public invalidateCache(guildId: string): void {
        guildCache.delete(guildId);
    }

    public clearCache(): void {
        guildCache.clear();
    }
}

export const discordGuildService = new DiscordGuildService();
