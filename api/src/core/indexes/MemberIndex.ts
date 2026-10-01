import { MemberRecord } from "./types.js";

export class MemberIndex {
    private readonly membersByGuild: Map<string, Map<string, MemberRecord>> = new Map();

    public setMember(record: MemberRecord): void {
        let guildMap = this.membersByGuild.get(record.guildId);
        if (!guildMap) {
            guildMap = new Map();
            this.membersByGuild.set(record.guildId, guildMap);
        }
        guildMap.set(record.userId, record);
    }

    public getMember(guildId: string, userId: string): MemberRecord | null {
        return this.membersByGuild.get(guildId)?.get(userId) ?? null;
    }

    public removeMember(guildId: string, userId: string): boolean {
        const guildMap = this.membersByGuild.get(guildId);
        if (!guildMap) {
            return false;
        }
        const deleted = guildMap.delete(userId);
        if (guildMap.size === 0) {
            this.membersByGuild.delete(guildId);
        }
        return deleted;
    }

    public removeGuild(guildId: string): void {
        this.membersByGuild.delete(guildId);
    }

    public getGuildMembers(guildId: string): MemberRecord[] {
        const guildMap = this.membersByGuild.get(guildId);
        if (!guildMap) {
            return [];
        }
        return Array.from(guildMap.values());
    }

    public getGuildMemberCount(guildId: string): number {
        return this.membersByGuild.get(guildId)?.size ?? 0;
    }

    public clear(): void {
        this.membersByGuild.clear();
    }

    public getRoleHoldersCount(guildId: string, roleId: string): number {
        const guildMap = this.membersByGuild.get(guildId);
        if (!guildMap) {
            return 0;
        }
        let count = 0;
        for (const record of guildMap.values()) {
            if (record.roleIds.includes(roleId)) {
                count += 1;
            }
        }
        return count;
    }

    public totalMemberships(): number {
        let total = 0;
        for (const guildMap of this.membersByGuild.values()) {
            total += guildMap.size;
        }
        return total;
    }
}

export const memberIndex = new MemberIndex();
