import { Guild, Role } from "discord.js-selfbot-v13";
import { memberIndex, computePermissionsBitmask } from "../../cache/MemberIndex.js";
import { stateStore } from "../../state/StateStore.js";
import { voiceSessionRepository } from "../../database/repositories/VoiceSessionRepository.js";
import { guildOwnershipManager } from "./guildOwnership.js";
import { IVoiceSession } from "../../database/models/VoiceSession.js";

export async function reconcileGuild(guild: Guild): Promise<boolean> {
    const clientId = guild.client.user?.id;
    if (!clientId || !guildOwnershipManager.claim(guild.id, clientId)) {
        return false;
    }

    for (const member of guild.members.cache.values()) {
        const roleIds = Array.from(member.roles.cache.values())
            .filter((r: Role) => r.id !== guild.id)
            .map((r: Role) => r.id);
        const bitmask = computePermissionsBitmask(member);

        memberIndex.setMember({
            id: member.id,
            guildId: guild.id,
            roleIds,
            rolesBitfield: bitmask.toString(),
            joinedTimestamp: member.joinedTimestamp || Date.now()
        });
    }

    if (guild.voiceStates?.cache) {
        const dbSessions = await voiceSessionRepository.getGuildActiveSessions(guild.id).catch(() => []);
        const dbSessionMap = new Map<string, IVoiceSession>();
        for (const s of dbSessions) {
            if (s && s.userId) {
                dbSessionMap.set(s.userId, s);
            }
        }

        for (const [userId, vs] of guild.voiceStates.cache) {
            if (!vs.channelId) continue;
            memberIndex.updateVoiceChannel(userId, guild.id, vs.channelId);

            const old = dbSessionMap.get(userId);
            if (old && old.channelId === vs.channelId) {
                stateStore.restoreObservedSession({
                    userId,
                    guildId: guild.id,
                    channelId: vs.channelId,
                    startedAt: old.startedAt ? new Date(old.startedAt).getTime() : Date.now()
                });
            } else {
                stateStore.recordVoiceUpdate(userId, guild.id, vs.channelId);
            }
        }
    }

    return true;
}
