import { Client, GuildMember, PartialGuildMember, VoiceState, Guild, Role } from "discord.js-selfbot-v13";
import { memberIndex, computePermissionsBitmask } from "../../cache/MemberIndex.js";
import { guildOwnershipManager } from "./guildOwnership.js";
import { discordClientManager } from "./clientManager.js";
import { reconcileGuild } from "./guildReconciler.js";
import { discordDangerService } from "../services/discordDanger.service.js";
import { discordUserService } from "../services/discordUser.service.js";
import { roleAlertService } from "../services/roleAlert.service.js";
import { eventBroadcaster } from "../../websocket/eventBroadcaster.js";
import { WsVoiceUpdatePayload, WsCacheInvalidatePayload } from "../../types/apiContracts.js";
import { eventProcessor } from "../../core/events/EventProcessor.js";

export function registerClientEvents(client: Client): void {
    client.on("ready", () => {
        for (const guild of client.guilds.cache.values()) {
            void reconcileGuild(guild).catch((err) => {
                console.error(`[Discord] Failed to reconcile guild ${guild.id}:`, err);
            });
        }
    });

    client.on("guildMemberAdd", (member: GuildMember) => {
        const clientId = client.user?.id || "";
        if (!guildOwnershipManager.isOwner(member.guild.id, clientId)) return;

        const roleIds = Array.from(member.roles.cache.values())
            .filter((r: Role) => r.id !== member.guild.id)
            .map((r: Role) => r.id);

        eventProcessor.process({
            type: "MEMBER_JOIN",
            guildId: member.guild.id,
            userId: member.id,
            roleIds,
            rolesBitfield: computePermissionsBitmask(member).toString(),
            joinedTimestamp: member.joinedTimestamp || Date.now(),
            version: 1,
            timestamp: Date.now()
        });
    });

    client.on("guildMemberRemove", (member: GuildMember | PartialGuildMember) => {
        const clientId = client.user?.id || "";
        if (!guildOwnershipManager.isOwner(member.guild.id, clientId)) return;

        eventProcessor.process({
            type: "MEMBER_LEAVE",
            guildId: member.guild.id,
            userId: member.id,
            roleIds: [],
            rolesBitfield: "0",
            joinedTimestamp: 0,
            version: 0,
            timestamp: Date.now()
        });
    });

    client.on("guildMemberUpdate", (_oldMember: GuildMember | PartialGuildMember, newMember: GuildMember) => {
        const clientId = client.user?.id || "";
        if (!guildOwnershipManager.isOwner(newMember.guild.id, clientId)) return;

        const previousRoleIds = memberIndex.getMember(newMember.id, newMember.guild.id)?.roleIds || [];

        const roleIds = Array.from(newMember.roles.cache.values())
            .filter((r: Role) => r.id !== newMember.guild.id)
            .map((r: Role) => r.id);

        eventProcessor.process({
            type: "MEMBER_UPDATE",
            guildId: newMember.guild.id,
            userId: newMember.id,
            roleIds,
            rolesBitfield: computePermissionsBitmask(newMember).toString(),
            joinedTimestamp: newMember.joinedTimestamp || Date.now(),
            version: 0,
            timestamp: Date.now()
        });

        discordDangerService.invalidateUser(newMember.id);
        discordUserService.invalidateUser(newMember.id);

        eventBroadcaster.broadcast<WsCacheInvalidatePayload>("CACHE_INVALIDATE", {
            target: "user-roles",
            path: `/api/user-roles/${newMember.id}`,
            timestamp: Date.now()
        });
        eventBroadcaster.broadcast<WsCacheInvalidatePayload>("CACHE_INVALIDATE", {
            target: "danger-roles",
            path: `/api/danger-roles/${newMember.id}`,
            timestamp: Date.now()
        });

        void roleAlertService.handleMemberUpdate(newMember, previousRoleIds).catch((err) => {
            console.error("[RoleAlertService] Error handling member update:", err);
        });
    });

    client.on("voiceStateUpdate", (oldState: VoiceState, newState: VoiceState) => {
        const guildId = newState.guild?.id || oldState.guild?.id;
        const clientId = client.user?.id || "";
        if (guildId && !guildOwnershipManager.isOwner(guildId, clientId)) return;

        const userId = newState.id || oldState.id;
        if (userId && guildId) {
            const extendedState = newState as unknown as {
                selfMute?: boolean;
                selfDeaf?: boolean;
                serverMute?: boolean;
                serverDeaf?: boolean;
                selfVideo?: boolean;
                streaming?: boolean;
            };

            eventProcessor.process({
                type: "VOICE_UPDATE",
                guildId,
                userId,
                channelId: newState.channelId || null,
                selfMute: Boolean(extendedState.selfMute),
                selfDeaf: Boolean(extendedState.selfDeaf),
                serverMute: Boolean(extendedState.serverMute),
                serverDeaf: Boolean(extendedState.serverDeaf),
                selfVideo: Boolean(extendedState.selfVideo),
                selfStream: Boolean(extendedState.streaming),
                timestamp: Date.now()
            });

            eventBroadcaster.broadcast<WsVoiceUpdatePayload>("VOICE_UPDATE", {
                userId,
                guildId,
                channelId: newState.channelId || null,
                timestamp: Date.now()
            });
            eventBroadcaster.broadcast<WsCacheInvalidatePayload>("CACHE_INVALIDATE", {
                target: "user-voice",
                path: `/api/user-voice/${userId}`,
                timestamp: Date.now()
            });
        }
    });

    client.on("guildCreate", (guild: Guild) => {
        void reconcileGuild(guild).catch((err) => {
            console.error(`[Discord] guildCreate reconcile error for ${guild.id}:`, err);
        });
    });

    client.on("guildDelete", (guild: Guild) => {
        const clientId = client.user?.id || "";
        const wasOwner = guildOwnershipManager.release(guild.id, clientId);
        const remainingClients = discordClientManager.getConnectedClients().filter((c) => c.user?.id !== clientId);
        let handedOver = false;

        for (const otherClient of remainingClients) {
            const otherClientId = otherClient.user?.id;
            if (otherClientId && otherClient.guilds.cache.has(guild.id)) {
                if (guildOwnershipManager.claim(guild.id, otherClientId)) {
                    handedOver = true;
                    const sharedGuild = otherClient.guilds.cache.get(guild.id);
                    if (sharedGuild) {
                        void reconcileGuild(sharedGuild).catch((err) => {
                            console.error(`[Discord] failover reconcile error for ${guild.id}:`, err);
                        });
                    }
                    break;
                }
            }
        }

        if (!handedOver && (wasOwner || remainingClients.every((c) => !c.guilds.cache.has(guild.id)))) {
            memberIndex.removeGuild(guild.id);
        }
    });
}
