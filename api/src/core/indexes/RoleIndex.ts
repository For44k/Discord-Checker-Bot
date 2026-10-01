import { RoleRecord } from "./types.js";

export class RoleIndex {
    private readonly rolesByGuild: Map<string, Map<string, RoleRecord>> = new Map();
    private readonly pendingDeletedRoles: Map<string, Set<string>> = new Map();

    public setRole(record: RoleRecord): void {
        let guildMap = this.rolesByGuild.get(record.guildId);
        if (!guildMap) {
            guildMap = new Map();
            this.rolesByGuild.set(record.guildId, guildMap);
        }
        guildMap.set(record.roleId, record);
    }

    public setRoles(guildId: string, records: RoleRecord[]): void {
        let guildMap = this.rolesByGuild.get(guildId);
        if (!guildMap) {
            guildMap = new Map();
            this.rolesByGuild.set(guildId, guildMap);
        }
        for (const record of records) {
            guildMap.set(record.roleId, record);
        }
    }

    public getRole(guildId: string, roleId: string): RoleRecord | null {
        const role = this.rolesByGuild.get(guildId)?.get(roleId);
        if (!role || role.deleted) {
            return null;
        }
        return role;
    }

    public getGuildRoles(guildId: string): RoleRecord[] {
        const guildMap = this.rolesByGuild.get(guildId);
        if (!guildMap) {
            return [];
        }
        const active: RoleRecord[] = [];
        for (const role of guildMap.values()) {
            if (!role.deleted) {
                active.push(role);
            }
        }
        return active;
    }

    public markRoleDeleted(guildId: string, roleId: string): void {
        const role = this.rolesByGuild.get(guildId)?.get(roleId);
        if (role) {
            role.deleted = true;
            role.updatedAt = Date.now();
            role.version += 1;
        }
        let pending = this.pendingDeletedRoles.get(guildId);
        if (!pending) {
            pending = new Set();
            this.pendingDeletedRoles.set(guildId, pending);
        }
        pending.add(roleId);
    }

    public isRoleDeleted(guildId: string, roleId: string): boolean {
        const role = this.rolesByGuild.get(guildId)?.get(roleId);
        if (role) {
            return role.deleted;
        }
        return this.pendingDeletedRoles.get(guildId)?.has(roleId) ?? false;
    }

    public getPendingDeletedRoles(guildId: string): Set<string> {
        return this.pendingDeletedRoles.get(guildId) ?? new Set();
    }

    public clearPendingDeletedRole(guildId: string, roleId: string): void {
        const pending = this.pendingDeletedRoles.get(guildId);
        if (pending) {
            pending.delete(roleId);
            if (pending.size === 0) {
                this.pendingDeletedRoles.delete(guildId);
            }
        }
    }

    public removeGuild(guildId: string): void {
        this.rolesByGuild.delete(guildId);
        this.pendingDeletedRoles.delete(guildId);
    }

    public clear(): void {
        this.rolesByGuild.clear();
        this.pendingDeletedRoles.clear();
    }
}

export const roleIndex = new RoleIndex();
