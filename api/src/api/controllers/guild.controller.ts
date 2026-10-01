import { Request, Response } from "express";
import { discordGuildService } from "../../discord/services/discordGuild.service.js";
import { discordClientManager } from "../../discord/client/clientManager.js";
import { presenceIndex } from "../../core/indexes/PresenceIndex.js";
import { userGuildStatsRepository } from "../../database/repositories/UserGuildStatsRepository.js";
import { UserGuildStatsModel } from "../../database/models/UserGuildStats.js";
import { ServerActionLogModel } from "../../database/models/ServerActionLog.model.js";
import { MemoryCache } from "../../cache/MemoryCache.js";
import { singleFlight } from "../../utils/singleFlight.js";
import { Guild, GuildBasedChannel } from "discord.js-selfbot-v13";

const responseCache = new MemoryCache<unknown>({ ttlMs: 60000, maxEntries: 5000 });
const SNOWFLAKE_REGEX = /^\d{17,20}$/;

export class GuildController {
    public async getServerInfo(req: Request, res: Response): Promise<void> {
        try {
            const { serverId } = req.params;
            if (!serverId || !SNOWFLAKE_REGEX.test(serverId)) {
                res.status(400).json({ success: false, error: "Invalid or missing serverId" });
                return;
            }

            const cacheKey = `guild:info:${serverId}`;
            const cached = responseCache.get(cacheKey);
            if (cached) {
                res.status(200).json({ success: true, data: cached });
                return;
            }

            const data = await singleFlight.do(cacheKey, async () => {
                const guild = await discordGuildService.resolveGuild(serverId);
                if (!guild) return null;

                const ownerId = guild.ownerId;
                let ownerMember = guild.members.cache.get(ownerId);
                let ownerUser = ownerMember?.user;

                if (!ownerUser && ownerId) {
                    for (const client of discordClientManager.getConnectedClients()) {
                        const u = client.users.cache.get(ownerId);
                        if (u) {
                            ownerUser = u;
                            break;
                        }
                    }
                }

                const getSnowflakeDate = (id: string): Date | null => {
                    if (!id || !SNOWFLAKE_REGEX.test(id)) return null;
                    try {
                        return new Date(Number((BigInt(id) >> 22n) + 1420070400000n));
                    } catch {
                        return null;
                    }
                };

                const ownerCreatedAt = ownerUser?.createdAt || getSnowflakeDate(ownerId);
                const ownerAvatar = ownerUser?.displayAvatarURL
                    ? ownerUser.displayAvatarURL({ dynamic: true, size: 512 })
                    : (ownerMember?.displayAvatarURL ? ownerMember.displayAvatarURL({ dynamic: true, size: 512 }) : null);
                const ownerBoostingServer = Boolean(ownerMember?.premiumSince);

                let ownerLastOnline: Date | string | null = null;
                let ownerOnlineStatus: string | null = null;

                const presence = ownerMember?.presence || (ownerId ? presenceIndex.getPresence(ownerId) : null);
                if (presence?.status && presence.status !== "offline") {
                    ownerOnlineStatus = presence.status;
                    ownerLastOnline = new Date();
                } else if (presence && "lastObservedAt" in presence && typeof (presence as { lastObservedAt?: number }).lastObservedAt === "number" && (presence as { lastObservedAt: number }).lastObservedAt > 0) {
                    ownerLastOnline = new Date((presence as { lastObservedAt: number }).lastObservedAt);
                }

                if (!ownerLastOnline && ownerId) {
                    const [statsRes, logRes] = await Promise.all([
                        UserGuildStatsModel.findOne({ userId: ownerId }).sort({ lastSeen: -1 }).select("lastSeen").lean().catch(() => null),
                        ServerActionLogModel.findOne({ $or: [{ executorId: ownerId }, { targetId: ownerId }] }).sort({ timestamp: -1 }).select("timestamp").lean().catch(() => null)
                    ]);
                    if (statsRes?.lastSeen) {
                        ownerLastOnline = statsRes.lastSeen;
                    } else if (logRes?.timestamp) {
                        ownerLastOnline = logRes.timestamp;
                    }
                }

                const channels = Array.from(guild.channels.cache.values());
                const totalCategories = channels.filter(c => c.type === "GUILD_CATEGORY" || (c.type as unknown) === 4).length;
                const totalChannels = channels.filter(c => c.type !== "GUILD_CATEGORY" && (c.type as unknown) !== 4).length;
                const voiceMembersCount = guild.voiceStates.cache.filter(vs => Boolean(vs.channelId)).size;

                const nonEveryoneRoles = Array.from(guild.roles.cache.values())
                    .filter(r => r.id !== guild.id && r.name !== "@everyone")
                    .sort((a, b) => b.position - a.position);

                const highestRole = nonEveryoneRoles[0] ? {
                    id: nonEveryoneRoles[0].id,
                    name: nonEveryoneRoles[0].name,
                    position: nonEveryoneRoles[0].position,
                    color: nonEveryoneRoles[0].hexColor
                } : null;

                let highestRoleHolders: Array<{ id: string; tag: string }> = [];
                if (nonEveryoneRoles[0]) {
                    const topRole = nonEveryoneRoles[0];
                    const holders = Array.from(guild.members.cache.values()).filter(m => m.roles.cache.has(topRole.id));
                    highestRoleHolders = holders.map(m => ({
                        id: m.id,
                        tag: m.user?.tag || m.displayName || m.id
                    }));
                }

                const sortedMembers = Array.from(guild.members.cache.values())
                    .filter(m => m.joinedTimestamp && !m.user?.bot)
                    .sort((a, b) => (a.joinedTimestamp || 0) - (b.joinedTimestamp || 0));

                const firstUserJoined = sortedMembers[0] ? {
                    id: sortedMembers[0].id,
                    joinedAt: sortedMembers[0].joinedAt
                } : null;

                const lastUserJoined = sortedMembers.length > 1 ? {
                    id: sortedMembers[sortedMembers.length - 1].id,
                    joinedAt: sortedMembers[sortedMembers.length - 1].joinedAt
                } : null;

                return {
                    id: guild.id,
                    name: guild.name,
                    icon: guild.iconURL({ dynamic: true, size: 512 }),
                    banner: guild.bannerURL({ size: 1024 }),
                    ownerId: guild.ownerId,
                    ownerAvatar,
                    ownerCreatedAt,
                    ownerLastOnline,
                    ownerOnlineStatus,
                    ownerBoostingServer,
                    memberCount: guild.memberCount || guild.members.cache.size,
                    channelCount: guild.channels.cache.size,
                    totalChannels,
                    totalCategories,
                    voiceMembersCount,
                    roleCount: guild.roles.cache.size,
                    highestRole,
                    highestRoleHolders,
                    firstUserJoined,
                    lastUserJoined,
                    emojiCount: guild.emojis.cache.size,
                    stickerCount: guild.stickers.cache.size,
                    boostLevel: guild.premiumTier,
                    boostCount: guild.premiumSubscriptionCount || 0,
                    createdAt: guild.createdAt,
                    features: guild.features,
                    vanityURL: guild.vanityURLCode || null,
                    description: guild.description || null
                };
            });

            if (!data) {
                res.status(404).json({ success: false, error: "Server not found or bot not in server" });
                return;
            }

            responseCache.set(cacheKey, data);
            res.status(200).json({ success: true, data });
        } catch (err) {
            console.error("[GuildController] getServerInfo error:", err);
            res.status(500).json({ success: false, error: "Internal server error" });
        }
    }

    public async getServerStatus(req: Request, res: Response): Promise<void> {
        try {
            const { serverId } = req.params;
            if (!serverId || !SNOWFLAKE_REGEX.test(serverId)) {
                res.status(400).json({ success: false, error: "Invalid or missing serverId" });
                return;
            }

            const cacheKey = `guild:status:${serverId}`;
            const cached = responseCache.get(cacheKey);
            if (cached) {
                res.status(200).json({ success: true, data: cached });
                return;
            }

            const guild = await discordGuildService.resolveGuild(serverId);
            if (!guild) {
                res.status(404).json({ success: false, error: "Server not found" });
                return;
            }

            const data = {
                id: guild.id,
                name: guild.name,
                available: guild.available,
                memberCount: guild.memberCount || guild.members.cache.size,
                large: guild.large,
                premiumTier: guild.premiumTier
            };

            responseCache.set(cacheKey, data);
            res.status(200).json({ success: true, data });
        } catch (err) {
            console.error("[GuildController] getServerStatus error:", err);
            res.status(500).json({ success: false, error: "Internal server error" });
        }
    }

    public async getServerChannels(req: Request, res: Response): Promise<void> {
        try {
            const { serverId } = req.params;
            if (!serverId || !SNOWFLAKE_REGEX.test(serverId)) {
                res.status(400).json({ success: false, error: "Invalid or missing serverId" });
                return;
            }

            const cacheKey = `guild:channels:${serverId}`;
            const cached = responseCache.get(cacheKey);
            if (cached) {
                res.status(200).json({ success: true, data: cached });
                return;
            }

            const guild = await discordGuildService.resolveGuild(serverId);
            if (!guild) {
                res.status(404).json({ success: false, error: "Server not found" });
                return;
            }

            const channels = Array.from(guild.channels.cache.values()).map((channel: GuildBasedChannel) => ({
                id: channel.id,
                name: "name" in channel ? channel.name : "channel",
                type: channel.type,
                parentId: "parentId" in channel ? channel.parentId : null,
                position: "position" in channel ? channel.position : 0
            }));

            responseCache.set(cacheKey, channels);
            res.status(200).json({ success: true, data: channels });
        } catch (err) {
            console.error("[GuildController] getServerChannels error:", err);
            res.status(500).json({ success: false, error: "Internal server error" });
        }
    }

    public async getServerMembers(req: Request, res: Response): Promise<void> {
        try {
            const { serverId } = req.params;
            if (!serverId || !SNOWFLAKE_REGEX.test(serverId)) {
                res.status(400).json({ success: false, error: "Invalid or missing serverId" });
                return;
            }

            const guild = await discordGuildService.resolveGuild(serverId);
            if (!guild) {
                res.status(404).json({ success: false, error: "Server not found" });
                return;
            }

            const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 1000, 1), 5000);
            const offset = Math.max(parseInt(req.query.offset as string, 10) || 0, 0);
            const allMembers = Array.from(guild.members.cache.values()).map((member) => ({ id: member.id, username: member.user.username, tag: member.user.tag }));
            const paged = allMembers.slice(offset, offset + limit);

            res.status(200).json({
                success: true,
                total: allMembers.length,
                count: paged.length,
                offset,
                limit,
                members: paged,
                data: paged,
                guildName: guild.name,
                guildIcon: guild.iconURL({ dynamic: true, size: 256 })
            });
        } catch (err) {
            console.error("[GuildController] getServerMembers error:", err);
            res.status(500).json({ success: false, error: "Internal server error" });
        }
    }

    public async getServerAdmins(req: Request, res: Response): Promise<void> {
        try {
            const { serverId } = req.params;
            if (!serverId || !SNOWFLAKE_REGEX.test(serverId)) {
                res.status(400).json({ success: false, error: "Invalid or missing serverId" });
                return;
            }

            const guild = await discordGuildService.resolveGuild(serverId);
            if (!guild) {
                res.status(404).json({ success: false, error: "Server not found" });
                return;
            }

            if (guild.members.cache.size < (guild.memberCount || 0)) {
                try {
                    await guild.members.fetch();
                } catch (_) {}
            }

            const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 1000, 1), 5000);
            const offset = Math.max(parseInt(req.query.offset as string, 10) || 0, 0);
            const allAdmins = Array.from(guild.members.cache.values())
                .filter((member) => !member.user?.bot && (member.permissions?.has("ADMINISTRATOR") || guild.ownerId === member.id))
                .map((member) => {
                    const avatar = member.user?.displayAvatarURL
                        ? member.user.displayAvatarURL({ dynamic: true, size: 256 })
                        : (member.displayAvatarURL ? member.displayAvatarURL({ dynamic: true, size: 256 }) : null);

                    const adminRoles = member.roles.cache
                        .filter((r) => r.id !== guild.id && r.permissions?.has("ADMINISTRATOR"))
                        .map((r) => ({ id: r.id, name: r.name }));

                    return {
                        id: member.id,
                        username: member.user?.username || member.id,
                        tag: member.user?.tag || member.user?.username || member.id,
                        nickname: member.nickname || null,
                        avatar: avatar || null,
                        user: {
                            id: member.id,
                            username: member.user?.username || member.id,
                            discriminator: member.user?.discriminator || "0",
                            tag: member.user?.tag || member.user?.username || member.id,
                            avatar: avatar || null,
                            bot: false
                        },
                        adminRoles,
                        roles: adminRoles,
                        isOwner: guild.ownerId === member.id,
                        joinedAt: member.joinedAt || null
                    };
                });
            const paged = allAdmins.slice(offset, offset + limit);

            res.status(200).json({
                success: true,
                total: allAdmins.length,
                count: paged.length,
                offset,
                limit,
                admins: paged,
                data: paged,
                guildName: guild.name,
                guildIcon: guild.iconURL({ dynamic: true, size: 256 })
            });
        } catch (err) {
            console.error("[GuildController] getServerAdmins error:", err);
            res.status(500).json({ success: false, error: "Internal server error" });
        }
    }

    public async getServerBots(req: Request, res: Response): Promise<void> {
        try {
            const { serverId } = req.params;
            if (!serverId || !SNOWFLAKE_REGEX.test(serverId)) {
                res.status(400).json({ success: false, error: "Invalid or missing serverId" });
                return;
            }

            const guild = await discordGuildService.resolveGuild(serverId);
            if (!guild) {
                res.status(404).json({ success: false, error: "Server not found" });
                return;
            }

            const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 1000, 1), 5000);
            const offset = Math.max(parseInt(req.query.offset as string, 10) || 0, 0);
            const allBots = Array.from(guild.members.cache.values()).filter((member) => member.user.bot).map((member) => ({ id: member.id, username: member.user.username, tag: member.user.tag }));
            const paged = allBots.slice(offset, offset + limit);

            res.status(200).json({
                success: true,
                total: allBots.length,
                count: paged.length,
                offset,
                limit,
                bots: paged,
                data: paged,
                guildName: guild.name,
                guildIcon: guild.iconURL({ dynamic: true, size: 256 })
            });
        } catch (err) {
            console.error("[GuildController] getServerBots error:", err);
            res.status(500).json({ success: false, error: "Internal server error" });
        }
    }

    public async getServerRolesWithIcons(req: Request, res: Response): Promise<void> {
        try {
            const { serverId } = req.params;
            if (!serverId || !SNOWFLAKE_REGEX.test(serverId)) {
                res.status(400).json({ success: false, error: "Invalid or missing serverId" });
                return;
            }

            const guild = await discordGuildService.resolveGuild(serverId);
            if (!guild) {
                res.status(404).json({ success: false, error: "Server not found" });
                return;
            }

            const roles = Array.from(guild.roles.cache.values()).map((role) => ({ id: role.id, name: role.name, icon: role.iconURL({ size: 256 }), position: role.position }));
            res.status(200).json({
                success: true,
                roles,
                data: roles,
                guildName: guild.name,
                guildIcon: guild.iconURL({ dynamic: true, size: 256 })
            });
        } catch (err) {
            console.error("[GuildController] getServerRolesWithIcons error:", err);
            res.status(500).json({ success: false, error: "Internal server error" });
        }
    }

    public async getServerEmojis(req: Request, res: Response): Promise<void> {
        try {
            const { serverId } = req.params;
            if (!serverId || !SNOWFLAKE_REGEX.test(serverId)) {
                res.status(400).json({ success: false, error: "Invalid or missing serverId" });
                return;
            }

            const guild = await discordGuildService.resolveGuild(serverId);
            if (!guild) {
                res.status(404).json({ success: false, error: "Server not found" });
                return;
            }

            const emojis = Array.from(guild.emojis.cache.values()).map((emoji) => ({ id: emoji.id, name: emoji.name, url: emoji.url, animated: emoji.animated }));
            res.status(200).json({
                success: true,
                emojis,
                data: emojis,
                guildName: guild.name,
                guildIcon: guild.iconURL({ dynamic: true, size: 256 })
            });
        } catch (err) {
            console.error("[GuildController] getServerEmojis error:", err);
            res.status(500).json({ success: false, error: "Internal server error" });
        }
    }

    public async getServerStickers(req: Request, res: Response): Promise<void> {
        try {
            const { serverId } = req.params;
            if (!serverId || !SNOWFLAKE_REGEX.test(serverId)) {
                res.status(400).json({ success: false, error: "Invalid or missing serverId" });
                return;
            }

            const guild = await discordGuildService.resolveGuild(serverId);
            if (!guild) {
                res.status(404).json({ success: false, error: "Server not found" });
                return;
            }

            res.status(200).json({ success: true, data: Array.from(guild.stickers.cache.values()) });
        } catch (err) {
            console.error("[GuildController] getServerStickers error:", err);
            res.status(500).json({ success: false, error: "Internal server error" });
        }
    }

    public async getGuildActiveVoice(req: Request, res: Response): Promise<void> {
        try {
            const guildId = req.params.guildId || req.params.serverId;
            if (!guildId || !SNOWFLAKE_REGEX.test(guildId)) {
                res.status(400).json({ success: false, error: "Invalid or missing guildId" });
                return;
            }

            const guild = await discordGuildService.resolveGuild(guildId);
            if (!guild) {
                res.status(404).json({ success: false, error: "Server not found" });
                return;
            }

            const data = Array.from(guild.voiceStates.cache.values()).filter((state) => state.channelId).map((state) => ({ userId: state.id, channelId: state.channelId }));
            res.status(200).json({ success: true, data });
        } catch (err) {
            console.error("[GuildController] getGuildActiveVoice error:", err);
            res.status(500).json({ success: false, error: "Internal server error" });
        }
    }

    public async getServerRoles(req: Request, res: Response): Promise<void> {
        try {
            const { serverId } = req.params;
            if (!serverId || !SNOWFLAKE_REGEX.test(serverId)) {
                res.status(400).json({ success: false, error: "Invalid or missing serverId" });
                return;
            }

            const cacheKey = `guild:roles:${serverId}`;
            const cached = responseCache.get(cacheKey);
            if (cached) {
                res.status(200).json({ success: true, data: cached });
                return;
            }

            const guild = await discordGuildService.resolveGuild(serverId);
            if (!guild) {
                res.status(404).json({ success: false, error: "Server not found" });
                return;
            }

            const roles = Array.from(guild.roles.cache.values()).map((role) => ({
                id: role.id,
                name: role.name,
                color: role.hexColor,
                position: role.position,
                permissions: role.permissions.bitfield.toString()
            }));

            responseCache.set(cacheKey, roles);
            res.status(200).json({ success: true, data: roles });
        } catch (err) {
            console.error("[GuildController] getServerRoles error:", err);
            res.status(500).json({ success: false, error: "Internal server error" });
        }
    }

    public invalidateCache(req: Request, res: Response): void {
        try {
            const { serverId } = req.params;
            if (!serverId || !SNOWFLAKE_REGEX.test(serverId)) {
                res.status(400).json({ success: false, error: "Invalid or missing serverId" });
                return;
            }

            discordGuildService.invalidateCache(serverId);
            responseCache.delete(`guild:info:${serverId}`);
            responseCache.delete(`guild:status:${serverId}`);
            responseCache.delete(`guild:channels:${serverId}`);
            responseCache.delete(`guild:roles:${serverId}`);

            res.status(200).json({ success: true, message: "Cache invalidated" });
        } catch (err) {
            console.error("[GuildController] invalidateCache error:", err);
            res.status(500).json({ success: false, error: "Internal server error" });
        }
    }
}

export const guildController = new GuildController();
