import { memberIndex as coreMemberIndex, MemberIndex as CoreMemberIndex } from "../core/indexes/MemberIndex.js";
import { userGuildIndex as coreUserGuildIndex } from "../core/indexes/UserGuildIndex.js";
import { roleIndex as coreRoleIndex } from "../core/indexes/RoleIndex.js";
import { voiceIndex as coreVoiceIndex } from "../core/indexes/VoiceIndex.js";
import { userVoiceIndex as coreUserVoiceIndex } from "../core/indexes/UserVoiceIndex.js";
import { guildStateManager } from "../core/state/GuildStateManager.js";
import {
    GuildSyncStatus,
    GuildSyncMetadata,
    MemberRecord as CoreMemberRecord,
    RoleRecord,
    VoiceRecord
} from "../core/indexes/types.js";

export type { GuildSyncStatus, GuildSyncMetadata };

export interface MemberRecord {
    guildId: string;
    userId: string;
    roleIds: string[];
    rolesBitfield: string;
    joinedTimestamp: number;
    updatedAt: number;
    version: number;
}

export interface VoiceStateRecord {
    guildId: string;
    userId: string;
    channelId: string;
    joinedAt: number;
    selfMute: boolean;
    selfDeaf: boolean;
    streaming: boolean;
    video: boolean;
}

export interface RoleDefinition {
    id: string;
    name: string;
    color: string;
    position: number;
    permissions: string;
}

export class MemberIndexWrapper {
    public setSyncStatus(guildId: string, status: GuildSyncStatus, memberCount: number = 0): void {
        guildStateManager.setSyncStatus(guildId, status, memberCount);
    }

    public getSyncStatus(guildId: string): GuildSyncMetadata {
        return guildStateManager.getSyncStatus(guildId);
    }

    public setRoleDefinition(guildId: string, role: RoleDefinition): void {
        const record: RoleRecord = {
            guildId,
            roleId: role.id,
            name: role.name,
            color: role.color,
            position: role.position,
            permissions: role.permissions,
            managed: false,
            version: 1,
            deleted: false,
            updatedAt: Date.now()
        };
        coreRoleIndex.setRole(record);
    }

    public getRoleDefinition(guildId: string, roleId: string): RoleDefinition | null {
        const role = coreRoleIndex.getRole(guildId, roleId);
        if (!role) {
            return null;
        }
        return {
            id: role.roleId,
            name: role.name,
            color: role.color,
            position: role.position,
            permissions: role.permissions
        };
    }

    public setRolesDefinitions(guildId: string, roles: RoleDefinition[]): void {
        const records: RoleRecord[] = roles.map((r) => ({
            guildId,
            roleId: r.id,
            name: r.name,
            color: r.color,
            position: r.position,
            permissions: r.permissions,
            managed: false,
            version: 1,
            deleted: false,
            updatedAt: Date.now()
        }));
        coreRoleIndex.setRoles(guildId, records);
    }

    public setMember(member: {
        id: string;
        guildId: string;
        roleIds?: string[];
        rolesBitfield?: bigint | string;
        joinedTimestamp?: number;
    }): void {
        const now = Date.now();
        const existing = coreMemberIndex.getMember(member.guildId, member.id);
        const record: CoreMemberRecord = {
            guildId: member.guildId,
            userId: member.id,
            roleIds: member.roleIds || existing?.roleIds || [],
            rolesBitfield: (member.rolesBitfield || existing?.rolesBitfield || "0").toString(),
            joinedTimestamp: member.joinedTimestamp || existing?.joinedTimestamp || now,
            updatedAt: now,
            version: (existing?.version ?? 0) + 1,
            generation: guildStateManager.getGeneration(member.guildId)
        };
        coreMemberIndex.setMember(record);
        coreUserGuildIndex.addMembership(member.id, member.guildId);
    }

    public indexMember(id: string, guildId: string, roleIds: string[] = [], rolesBitfield: bigint | string = "0"): void {
        this.setMember({
            id,
            guildId,
            roleIds,
            rolesBitfield: rolesBitfield.toString(),
            joinedTimestamp: Date.now()
        });
    }

    public updateVoiceChannel(
        userId: string,
        guildId: string,
        channelId: string | null,
        meta?: { selfMute?: boolean; selfDeaf?: boolean; streaming?: boolean; video?: boolean }
    ): void {
        if (!channelId) {
            coreVoiceIndex.removeVoiceState(guildId, userId);
            coreUserVoiceIndex.removeVoiceConnection(userId, guildId);
            return;
        }

        const record: VoiceRecord = {
            guildId,
            userId,
            channelId,
            observedJoinedAt: Date.now(),
            selfMute: Boolean(meta?.selfMute),
            selfDeaf: Boolean(meta?.selfDeaf),
            serverMute: false,
            serverDeaf: false,
            selfVideo: Boolean(meta?.video),
            selfStream: Boolean(meta?.streaming),
            updatedAt: Date.now()
        };
        coreVoiceIndex.setVoiceState(record);
        coreUserVoiceIndex.addVoiceConnection(userId, guildId);
    }

    public removeMember(userId: string, guildId: string): boolean {
        const removed = coreMemberIndex.removeMember(guildId, userId);
        coreUserGuildIndex.removeMembership(userId, guildId);
        this.updateVoiceChannel(userId, guildId, null);
        return removed;
    }

    public removeGuild(guildId: string): void {
        coreMemberIndex.removeGuild(guildId);
        coreUserGuildIndex.removeGuild(guildId);
        coreVoiceIndex.removeGuild(guildId);
        coreUserVoiceIndex.removeGuild(guildId);
        coreRoleIndex.removeGuild(guildId);
        guildStateManager.removeGuild(guildId);
    }

    public getMember(userId: string, guildId: string): MemberRecord | null {
        const rec = coreMemberIndex.getMember(guildId, userId);
        if (!rec) {
            return null;
        }
        return {
            guildId: rec.guildId,
            userId: rec.userId,
            roleIds: rec.roleIds,
            rolesBitfield: rec.rolesBitfield,
            joinedTimestamp: rec.joinedTimestamp,
            updatedAt: rec.updatedAt,
            version: rec.version
        };
    }

    public get(userId: string): MemberRecord | null {
        const guilds = coreUserGuildIndex.getGuildsForUser(userId);
        if (guilds.size === 0) {
            return null;
        }
        const firstGuildId = guilds.values().next().value;
        if (!firstGuildId) {
            return null;
        }
        return this.getMember(userId, firstGuildId);
    }

    public getByGuild(guildId: string): MemberRecord[] {
        return coreMemberIndex.getGuildMembers(guildId).map((rec) => ({
            guildId: rec.guildId,
            userId: rec.userId,
            roleIds: rec.roleIds,
            rolesBitfield: rec.rolesBitfield,
            joinedTimestamp: rec.joinedTimestamp,
            updatedAt: rec.updatedAt,
            version: rec.version
        }));
    }

    public getVoiceRecord(userId: string, guildId: string): VoiceStateRecord | null {
        const rec = coreVoiceIndex.getVoiceState(guildId, userId);
        if (!rec) {
            return null;
        }
        return {
            guildId: rec.guildId,
            userId: rec.userId,
            channelId: rec.channelId,
            joinedAt: rec.observedJoinedAt,
            selfMute: rec.selfMute,
            selfDeaf: rec.selfDeaf,
            streaming: rec.selfStream,
            video: rec.selfVideo
        };
    }

    public getVoiceGuildsForUser(userId: string): Map<string, VoiceStateRecord> {
        const result = new Map<string, VoiceStateRecord>();
        const guilds = coreUserVoiceIndex.getGuildsForUser(userId);
        for (const guildId of guilds) {
            const rec = this.getVoiceRecord(userId, guildId);
            if (rec) {
                result.set(guildId, rec);
            }
        }
        return result;
    }

    public getGuildsForUser(userId: string): Map<string, string[]> {
        const result = new Map<string, string[]>();
        const guilds = coreUserGuildIndex.getGuildsForUser(userId);
        for (const guildId of guilds) {
            const member = coreMemberIndex.getMember(guildId, userId);
            if (member) {
                result.set(guildId, member.roleIds);
            }
        }
        return result;
    }

    public getUserBitmask(userId: string, guildId: string): bigint {
        const member = coreMemberIndex.getMember(guildId, userId);
        if (!member) {
            return 0n;
        }
        try {
            return BigInt(member.rolesBitfield || "0");
        } catch {
            return 0n;
        }
    }

    public clear(): void {
        coreMemberIndex.clear();
        coreUserGuildIndex.clear();
        coreVoiceIndex.clear();
        coreUserVoiceIndex.clear();
        coreRoleIndex.clear();
        guildStateManager.clear();
    }

    public getRoleHoldersCount(guildId: string, roleId: string): number {
        return coreMemberIndex.getRoleHoldersCount(guildId, roleId);
    }

    public size(): number {
        return coreMemberIndex.totalMemberships();
    }
}

export const memberIndex = new MemberIndexWrapper();
export const DANGEROUS_BITMASK = BigInt("2199023255551");

export interface MemberWithPermissions {
    permissions?: {
        bitfield?: bigint | number | string;
    };
}

export function computePermissionsBitmask(member: MemberWithPermissions | null | undefined): bigint {
    const raw = member?.permissions?.bitfield;
    if (raw === undefined || raw === null) {
        return 0n;
    }
    try {
        return BigInt(raw.toString());
    } catch {
        return 0n;
    }
}
