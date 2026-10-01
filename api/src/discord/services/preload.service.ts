import { Guild, GuildMember, Role, VoiceState } from "discord.js-selfbot-v13";
import { discordClientManager } from "../client/clientManager.js";
import { memberIndex, RoleDefinition } from "../../cache/MemberIndex.js";
import { stateStore } from "../../state/StateStore.js";
import { voiceSessionRepository } from "../../database/repositories/VoiceSessionRepository.js";
import { computePermissionsBitmask } from "../../cache/MemberIndex.js";
import { IVoiceSession } from "../../database/models/VoiceSession.js";

export class PreloadService {
    private isPreloaded = false;

    public async preloadAllGuilds(): Promise<void> {
        const clients = discordClientManager.getConnectedClients();
        const guilds = clients.flatMap((client) => Array.from(client.guilds.cache.values()));
        let checkedUsers = 0;

        for (const guild of guilds) {
            checkedUsers += guild.memberCount || 0;
            await this.reconcileGuild(guild);
            await new Promise((resolve) => setImmediate(resolve));
        }

        this.isPreloaded = true;
    }

    public async reconcileGuild(guild: Guild | null | undefined): Promise<void> {
        if (!guild?.id) return;
        memberIndex.setSyncStatus(guild.id, "SYNCING", guild.memberCount || 0);

        try {
            if (guild.roles?.cache) {
                const roleDefs: RoleDefinition[] = Array.from(guild.roles.cache.values()).map((r: Role) => ({
                    id: r.id,
                    name: r.name,
                    color: r.hexColor || "#000000",
                    position: r.position || 0,
                    permissions: r.permissions?.bitfield?.toString() || "0"
                }));
                memberIndex.setRolesDefinitions(guild.id, roleDefs);
            }

            for (const [, member] of guild.members.cache) {
                const roleIds = Array.from(member.roles.cache.values())
                    .filter((r: Role) => r.id !== guild.id)
                    .map((r: Role) => r.id);
                const bitmask = computePermissionsBitmask(member);
                memberIndex.indexMember(member.id, guild.id, roleIds, bitmask);
            }

            if (guild.voiceStates?.cache) {
                const dbSessions = await voiceSessionRepository.getGuildActiveSessions(guild.id).catch(() => []);
                const dbSessionMap = new Map<string, IVoiceSession>();
                for (const s of dbSessions) {
                    if (s?.userId) dbSessionMap.set(s.userId, s);
                }

                for (const [userId, vs] of guild.voiceStates.cache) {
                    if (!vs.channelId) continue;
                    const extendedVs = vs as unknown as { selfVideo?: boolean };
                    memberIndex.updateVoiceChannel(userId, guild.id, vs.channelId, {
                        selfMute: Boolean(vs.selfMute),
                        selfDeaf: Boolean(vs.selfDeaf),
                        streaming: Boolean(vs.streaming),
                        video: Boolean(extendedVs.selfVideo)
                    });
                    const existingDb = dbSessionMap.get(userId);
                    const startedAt = existingDb?.startedAt ? new Date(existingDb.startedAt).getTime() : Date.now();
                    stateStore.restoreObservedSession({
                        userId,
                        guildId: guild.id,
                        channelId: vs.channelId,
                        startedAt
                    });
                }
            }

            memberIndex.setSyncStatus(guild.id, "READY", guild.memberCount || 0);
        } catch (error) {
            memberIndex.setSyncStatus(guild.id, "FAILED", guild.memberCount || 0);
        }
    }

    public get ready(): boolean {
        return this.isPreloaded;
    }
}

export const preloadService = new PreloadService();
