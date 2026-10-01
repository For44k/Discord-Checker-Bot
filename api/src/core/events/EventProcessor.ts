import { memberIndex } from "../indexes/MemberIndex.js";
import { userGuildIndex } from "../indexes/UserGuildIndex.js";
import { roleIndex } from "../indexes/RoleIndex.js";
import { voiceIndex } from "../indexes/VoiceIndex.js";
import { userVoiceIndex } from "../indexes/UserVoiceIndex.js";
import { presenceIndex } from "../indexes/PresenceIndex.js";
import { guildStateManager } from "../state/GuildStateManager.js";
import { writeManager } from "../../database/WriteManager.js";
import { stateStore } from "../../state/StateStore.js";
import {
    NormalizedEvent,
    NormalizedMemberEvent,
    NormalizedRoleEvent,
    NormalizedVoiceEvent,
    NormalizedPresenceEvent
} from "./types.js";
import { MemberRecord, RoleRecord, VoiceRecord, PresenceRecord } from "../indexes/types.js";

export class EventProcessor {
    public process(event: NormalizedEvent): void {
        const guildId = "guildId" in event ? event.guildId : null;
        if (guildId && guildStateManager.isSyncing(guildId)) {
            const buffered = guildStateManager.bufferEvent(guildId, event);
            if (buffered) {
                return;
            }
        }

        switch (event.type) {
            case "MEMBER_JOIN":
            case "MEMBER_LEAVE":
            case "MEMBER_UPDATE":
                this.processMemberEvent(event);
                break;
            case "ROLE_CREATE":
            case "ROLE_UPDATE":
            case "ROLE_DELETE":
                this.processRoleEvent(event);
                break;
            case "VOICE_UPDATE":
                this.processVoiceEvent(event);
                break;
            case "PRESENCE_UPDATE":
                this.processPresenceEvent(event);
                break;
        }
    }

    public processMemberEvent(event: NormalizedMemberEvent): void {
        const currentGen = guildStateManager.getGeneration(event.guildId);
        const existing = memberIndex.getMember(event.guildId, event.userId);

        if (event.type === "MEMBER_LEAVE") {
            if (existing) {
                if (existing.generation > currentGen) {
                    return;
                }
                if (existing.generation === currentGen && (event.version > 0 && event.version < existing.version || event.timestamp < existing.updatedAt)) {
                    return;
                }
            }

            memberIndex.removeMember(event.guildId, event.userId);
            userGuildIndex.removeMembership(event.userId, event.guildId);
            voiceIndex.removeVoiceState(event.guildId, event.userId);
            userVoiceIndex.removeVoiceConnection(event.userId, event.guildId);

            writeManager.queueMemberWrite({
                guildId: event.guildId,
                userId: event.userId,
                roleIds: [],
                rolesBitfield: "0",
                joinedAt: event.timestamp,
                updatedAt: event.timestamp,
                version: (existing?.version ?? 0) + 1,
                generation: currentGen,
                isDelete: true
            });
            return;
        }

        if (existing) {
            if (existing.generation > currentGen) {
                return;
            }
            if (existing.generation === currentGen) {
                if (event.version > 0 && event.version < existing.version) {
                    return;
                }
                if (event.timestamp < existing.updatedAt && event.version <= existing.version) {
                    return;
                }
            }
        }

        const nextVersion = event.version > 0 ? event.version : (existing?.version ?? 0) + 1;
        const record: MemberRecord = {
            guildId: event.guildId,
            userId: event.userId,
            roleIds: event.roleIds,
            rolesBitfield: event.rolesBitfield || "0",
            joinedTimestamp: event.joinedTimestamp || existing?.joinedTimestamp || event.timestamp,
            updatedAt: event.timestamp,
            version: nextVersion,
            generation: currentGen
        };

        memberIndex.setMember(record);
        userGuildIndex.addMembership(event.userId, event.guildId);

        writeManager.queueMemberWrite({
            guildId: event.guildId,
            userId: event.userId,
            roleIds: record.roleIds,
            rolesBitfield: record.rolesBitfield,
            joinedAt: record.joinedTimestamp,
            updatedAt: record.updatedAt,
            version: record.version,
            generation: record.generation,
            isDelete: false
        });
    }

    public processRoleEvent(event: NormalizedRoleEvent): void {
        const existing = roleIndex.getRole(event.guildId, event.roleId);

        if (event.type === "ROLE_DELETE") {
            roleIndex.markRoleDeleted(event.guildId, event.roleId);
            writeManager.queueRoleWrite({
                guildId: event.guildId,
                roleId: event.roleId,
                name: existing?.name ?? event.name,
                color: existing?.color ?? event.color,
                position: existing?.position ?? event.position,
                permissions: existing?.permissions ?? event.permissions,
                managed: existing?.managed ?? event.managed,
                version: (existing?.version ?? 0) + 1,
                updatedAt: event.timestamp,
                isDelete: true
            });
            return;
        }

        if (existing && event.version > 0 && event.version < existing.version) {
            return;
        }

        const nextVersion = event.version > 0 ? event.version : (existing?.version ?? 0) + 1;
        const record: RoleRecord = {
            guildId: event.guildId,
            roleId: event.roleId,
            name: event.name,
            color: event.color,
            position: event.position,
            permissions: event.permissions,
            managed: event.managed,
            version: nextVersion,
            deleted: false,
            updatedAt: event.timestamp
        };

        roleIndex.setRole(record);
        roleIndex.clearPendingDeletedRole(event.guildId, event.roleId);

        writeManager.queueRoleWrite({
            guildId: record.guildId,
            roleId: record.roleId,
            name: record.name,
            color: record.color,
            position: record.position,
            permissions: record.permissions,
            managed: record.managed,
            version: record.version,
            updatedAt: record.updatedAt,
            isDelete: false
        });
    }

    public processVoiceEvent(event: NormalizedVoiceEvent): void {
        if (!event.channelId) {
            voiceIndex.removeVoiceState(event.guildId, event.userId);
            userVoiceIndex.removeVoiceConnection(event.userId, event.guildId);
            stateStore.recordVoiceUpdate(event.userId, event.guildId, null);
            return;
        }

        const record: VoiceRecord = {
            guildId: event.guildId,
            userId: event.userId,
            channelId: event.channelId,
            observedJoinedAt: event.timestamp,
            selfMute: event.selfMute,
            selfDeaf: event.selfDeaf,
            serverMute: event.serverMute,
            serverDeaf: event.serverDeaf,
            selfVideo: event.selfVideo,
            selfStream: event.selfStream,
            updatedAt: event.timestamp
        };

        voiceIndex.setVoiceState(record);
        userVoiceIndex.addVoiceConnection(event.userId, event.guildId);
        stateStore.recordVoiceUpdate(event.userId, event.guildId, event.channelId);
    }

    public processPresenceEvent(event: NormalizedPresenceEvent): void {
        const record: PresenceRecord = {
            userId: event.userId,
            status: event.status,
            desktop: event.desktop,
            mobile: event.mobile,
            web: event.web,
            lastObservedAt: event.timestamp
        };
        presenceIndex.setPresence(record);
    }
}

export const eventProcessor = new EventProcessor();
