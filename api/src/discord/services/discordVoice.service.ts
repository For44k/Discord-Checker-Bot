import { Guild, GuildMember, Role, VoiceChannel, StageChannel } from "discord.js-selfbot-v13";
import { discordClientManager } from "../client/clientManager.js";
import { stateStore } from "../../state/StateStore.js";
import { memberIndex } from "../../cache/MemberIndex.js";

export interface TopVoiceServer {
    top?: number;
    id: string;
    guildId?: string;
    tag: string;
    name?: string;
    guildName?: string;
    avatar: string | null;
    guildIcon: string | null;
    score: number;
    voiceCount?: number;
    membersCount: number;
}

export interface VoiceChannelMemberDetail {
    id: string;
    tag: string;
    username: string;
    avatar: string | null;
    selfMute: boolean;
    selfDeaf: boolean;
    serverMute: boolean;
    serverDeaf: boolean;
    streaming: boolean;
    video: boolean;
}

export interface VoiceUserMatch {
    guildId: string;
    guildName: string;
    guildIcon: string | null;
    channelId: string;
    channelName: string;
    membersCount: number;
    membersList: VoiceChannelMemberDetail[];
    selfMute: boolean;
    selfDeaf: boolean;
    streaming: boolean;
    video: boolean;
}

export interface RoleVoiceMemberItem {
    id: string;
    tag: string;
    username: string;
    avatar: string | null;
    channelId: string | null;
}

export interface RoleVoiceMembersResponse {
    guildId: string;
    roleId: string;
    roleName: string;
    totalRoleMembers: number;
    inVoiceCount: number;
    notInVoiceCount: number;
    inVoice: RoleVoiceMemberItem[];
    notInVoice: RoleVoiceMemberItem[];
}

export class DiscordVoiceService {
    private topVoiceCache: { expiresAt: number; response: { success: boolean; ready: boolean; data: TopVoiceServer[]; lastUpdate: string; totalServers: number } } | null = null;

    public getTopVoiceServers(limit: number = 100): { success: boolean; ready: boolean; data: TopVoiceServer[]; lastUpdate: string; totalServers: number } {
        if (this.topVoiceCache && this.topVoiceCache.expiresAt > Date.now()) {
            return { ...this.topVoiceCache.response, data: this.topVoiceCache.response.data.slice(0, limit) };
        }
        const clients = discordClientManager.getConnectedClients();
        const servers: TopVoiceServer[] = [];
        const seenGuilds = new Set<string>();

        for (const client of clients) {
            for (const guild of client.guilds.cache.values()) {
                if (seenGuilds.has(guild.id)) continue;
                seenGuilds.add(guild.id);
                let count = 0;
                if (guild.voiceStates?.cache) {
                    for (const vs of guild.voiceStates.cache.values()) {
                        if (!vs.channelId) continue;
                        const member = guild.members.cache.get(vs.id);
                        const isBot = member?.user?.bot ?? client.users.cache.get(vs.id)?.bot ?? false;
                        if (!isBot) count++;
                    }
                }
                if (count > 0) {
                    const iconUrl = guild.iconURL({ size: 128, dynamic: true });
                    servers.push({
                        id: guild.id,
                        guildId: guild.id,
                        tag: guild.name,
                        name: guild.name,
                        guildName: guild.name,
                        avatar: iconUrl,
                        guildIcon: iconUrl,
                        score: count,
                        voiceCount: count,
                        membersCount: guild.memberCount || 0
                    });
                }
            }
        }

        const sorted = servers
            .sort((a, b) => b.score - a.score)
            .map((s, idx) => ({ top: idx + 1, ...s }));

        const response = {
            success: true,
            ready: true,
            data: sorted.slice(0, limit),
            lastUpdate: new Date().toISOString(),
            totalServers: seenGuilds.size
        };
        this.topVoiceCache = { expiresAt: Date.now() + 10000, response };
        return response;
    }

    public findUserVoiceAcrossGuilds(userId: string): VoiceUserMatch[] {
        const clients = discordClientManager.getConnectedClients();
        const matches: VoiceUserMatch[] = [];

        const activeChannelMap = stateStore.getUserVoiceChannel(userId);
        const userGuildsMap = memberIndex.getGuildsForUser(userId);

        const targetGuildIds = new Set<string>();
        if (activeChannelMap) {
            for (const gId of activeChannelMap.keys()) {
                targetGuildIds.add(gId);
            }
        }
        if (userGuildsMap) {
            for (const gId of userGuildsMap.keys()) {
                targetGuildIds.add(gId);
            }
        }

        const guildMap = new Map<string, Guild>();
        for (const client of clients) {
            for (const guild of client.guilds.cache.values()) {
                guildMap.set(guild.id, guild);
            }
        }
        const guildsToScan: Guild[] = targetGuildIds.size > 0
            ? Array.from(targetGuildIds).map((id) => guildMap.get(id)).filter((g): g is Guild => g !== undefined)
            : Array.from(guildMap.values());

        for (const guild of guildsToScan) {
            const vs = guild.voiceStates?.cache?.get(userId);
            const liveChannelId = vs?.channelId || activeChannelMap?.get(guild.id);

            if (!liveChannelId) continue;

            const channel = vs?.channel || guild.channels.cache.get(liveChannelId);
            const channelName = channel && "name" in channel ? (channel as { name: string }).name : "Voice Channel";

            const membersList: VoiceChannelMemberDetail[] = [];
            if (guild.voiceStates?.cache) {
                for (const otherVs of guild.voiceStates.cache.values()) {
                    if (otherVs.channelId === liveChannelId) {
                        const member: GuildMember | undefined = guild.members.cache.get(otherVs.id);
                        membersList.push({
                            id: otherVs.id,
                            tag: member?.user?.tag || member?.user?.username || otherVs.id,
                            username: member?.user?.username || otherVs.id,
                            avatar: member?.user?.displayAvatarURL ? member.user.displayAvatarURL({ dynamic: true, size: 128 }) : null,
                            selfMute: otherVs.selfMute || false,
                            selfDeaf: otherVs.selfDeaf || false,
                            serverMute: otherVs.serverMute || false,
                            serverDeaf: otherVs.serverDeaf || false,
                            streaming: otherVs.streaming || false,
                            video: otherVs.selfVideo || false
                        });
                    }
                }
            }

            if (membersList.length === 0) {
                membersList.push({
                    id: userId,
                    tag: "Target User",
                    username: "user",
                    avatar: null,
                    selfMute: vs?.selfMute || false,
                    selfDeaf: vs?.selfDeaf || false,
                    serverMute: vs?.serverMute || false,
                    serverDeaf: vs?.serverDeaf || false,
                    streaming: vs?.streaming || false,
                    video: vs?.selfVideo || false
                });
            }

            matches.push({
                guildId: guild.id,
                guildName: guild.name,
                guildIcon: guild.iconURL({ dynamic: true, size: 256 }),
                channelId: liveChannelId,
                channelName,
                membersCount: membersList.length,
                membersList,
                selfMute: vs?.selfMute || false,
                selfDeaf: vs?.selfDeaf || false,
                streaming: vs?.streaming || false,
                video: vs?.selfVideo || false
            });
        }

        return matches;
    }

    public getRoleVoiceMembers(guildId: string, roleId: string): RoleVoiceMembersResponse | null {
        const client = discordClientManager.getClientForGuild(guildId) || discordClientManager.getClient();
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return null;

        const role: Role | undefined = guild.roles.cache.get(roleId);
        if (!role) return null;

        const inVoice: RoleVoiceMemberItem[] = [];
        const notInVoice: RoleVoiceMemberItem[] = [];

        const membersSource = role.members && role.members.size > 0
            ? role.members.values()
            : guild.members.cache.values();

        for (const member of membersSource) {
            if (member.roles.cache.has(roleId)) {
                const vs = guild.voiceStates?.cache?.get(member.id);
                const info: RoleVoiceMemberItem = {
                    id: member.id,
                    tag: member.user?.tag || member.user?.username || member.id,
                    username: member.user?.username || member.id,
                    avatar: member.user?.displayAvatarURL ? member.user.displayAvatarURL({ dynamic: true }) : null,
                    channelId: vs?.channelId || null
                };
                if (vs?.channelId) inVoice.push(info);
                else notInVoice.push(info);
            }
        }

        return {
            guildId,
            roleId,
            roleName: role.name,
            totalRoleMembers: inVoice.length + notInVoice.length,
            inVoiceCount: inVoice.length,
            notInVoiceCount: notInVoice.length,
            inVoice,
            notInVoice
        };
    }
}

export const discordVoiceService = new DiscordVoiceService();
