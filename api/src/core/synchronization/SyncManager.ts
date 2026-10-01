import { memberIndex } from "../indexes/MemberIndex.js";
import { userGuildIndex } from "../indexes/UserGuildIndex.js";
import { roleIndex } from "../indexes/RoleIndex.js";
import { guildStateManager } from "../state/GuildStateManager.js";
import { eventProcessor } from "../events/EventProcessor.js";
import { writeManager } from "../../database/WriteManager.js";
import { MemberRecord, RoleRecord } from "../indexes/types.js";

export interface SnapshotData {
    guildId: string;
    members: MemberRecord[];
    roles: RoleRecord[];
}

export class SyncManager {
    public startSync(guildId: string): number {
        const meta = guildStateManager.setSyncStatus(guildId, "SYNCING");
        return meta.generation;
    }

    public completeSync(snapshot: SnapshotData, syncGeneration: number): boolean {
        const currentMeta = guildStateManager.getSyncStatus(snapshot.guildId);
        if (currentMeta.status !== "SYNCING" || currentMeta.generation !== syncGeneration) {
            return false;
        }

        roleIndex.setRoles(snapshot.guildId, snapshot.roles);
        for (const role of snapshot.roles) {
            writeManager.queueRoleWrite({
                guildId: role.guildId,
                roleId: role.roleId,
                name: role.name,
                color: role.color,
                position: role.position,
                permissions: role.permissions,
                managed: role.managed,
                version: role.version,
                updatedAt: role.updatedAt,
                isDelete: false
            });
        }

        for (const member of snapshot.members) {
            const existing = memberIndex.getMember(member.guildId, member.userId);
            if (existing && existing.generation >= syncGeneration) {
                continue;
            }

            const record: MemberRecord = {
                guildId: member.guildId,
                userId: member.userId,
                roleIds: member.roleIds,
                rolesBitfield: member.rolesBitfield,
                joinedTimestamp: member.joinedTimestamp,
                updatedAt: member.updatedAt,
                version: member.version,
                generation: syncGeneration
            };

            memberIndex.setMember(record);
            userGuildIndex.addMembership(member.userId, member.guildId);

            writeManager.queueMemberWrite({
                guildId: record.guildId,
                userId: record.userId,
                roleIds: record.roleIds,
                rolesBitfield: record.rolesBitfield,
                joinedAt: record.joinedTimestamp,
                updatedAt: record.updatedAt,
                version: record.version,
                generation: record.generation,
                isDelete: false
            });
        }

        const buffered = guildStateManager.drainBufferedEvents(snapshot.guildId);
        guildStateManager.setSyncStatus(snapshot.guildId, "READY", snapshot.members.length);

        for (const event of buffered) {
            eventProcessor.process(event);
        }

        writeManager.queueCheckpointWrite({
            guildId: snapshot.guildId,
            status: "READY",
            memberCount: snapshot.members.length,
            generation: syncGeneration,
            lastSyncedAt: Date.now()
        });

        return true;
    }

    public failSync(guildId: string): void {
        guildStateManager.drainBufferedEvents(guildId);
        guildStateManager.setSyncStatus(guildId, "FAILED");
        writeManager.queueCheckpointWrite({
            guildId,
            status: "FAILED",
            memberCount: 0,
            generation: guildStateManager.getGeneration(guildId),
            lastSyncedAt: Date.now()
        });
    }

    public markStale(guildId: string): void {
        const meta = guildStateManager.getSyncStatus(guildId);
        guildStateManager.setSyncStatus(guildId, "STALE", meta.memberCount);
    }
}

export const syncManager = new SyncManager();
