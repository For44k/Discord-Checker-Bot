export interface GuildOwnershipRecord {
    guildId: string;
    workerId: string;
    epoch: number;
    claimedAt: number;
}

export class GuildOwnershipManager {
    private ownershipMap: Map<string, GuildOwnershipRecord> = new Map();

    claim(guildId: string, workerId: string): boolean {
        const current = this.ownershipMap.get(guildId);
        if (!current) {
            this.ownershipMap.set(guildId, {
                guildId,
                workerId,
                epoch: 1,
                claimedAt: Date.now()
            });
            return true;
        }

        if (current.workerId === workerId) {
            return true;
        }

        return false;
    }

    forceFailover(guildId: string, newWorkerId: string): number {
        const current = this.ownershipMap.get(guildId);
        const newEpoch = (current?.epoch ?? 0) + 1;
        this.ownershipMap.set(guildId, {
            guildId,
            workerId: newWorkerId,
            epoch: newEpoch,
            claimedAt: Date.now()
        });
        return newEpoch;
    }

    isOwner(guildId: string, workerId: string, epoch?: number): boolean {
        const current = this.ownershipMap.get(guildId);
        if (!current || current.workerId !== workerId) return false;
        if (epoch !== undefined && current.epoch !== epoch) return false;
        return true;
    }

    getOwner(guildId: string): string | undefined {
        return this.ownershipMap.get(guildId)?.workerId;
    }

    getEpoch(guildId: string): number {
        return this.ownershipMap.get(guildId)?.epoch ?? 0;
    }

    release(guildId: string, workerId: string): boolean {
        const current = this.ownershipMap.get(guildId);
        if (current && current.workerId === workerId) {
            this.ownershipMap.delete(guildId);
            return true;
        }
        return false;
    }

    releaseAllForClient(workerId: string): string[] {
        const released: string[] = [];
        for (const [guildId, rec] of this.ownershipMap.entries()) {
            if (rec.workerId === workerId) {
                this.ownershipMap.delete(guildId);
                released.push(guildId);
            }
        }
        return released;
    }

    clear(): void {
        this.ownershipMap.clear();
    }
}

export const guildOwnershipManager = new GuildOwnershipManager();
