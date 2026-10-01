import { AnyBulkWriteOperation } from "mongoose";
import { MemberModel, IMemberDocument } from "./models/Member.model.js";
import { RoleModel, IRoleDocument } from "./models/Role.model.js";
import { SyncCheckpointModel, ISyncCheckpointDocument } from "./models/SyncCheckpoint.model.js";

export interface PendingMemberWrite {
    guildId: string;
    userId: string;
    roleIds: string[];
    rolesBitfield: string;
    joinedAt: number;
    updatedAt: number;
    version: number;
    generation: number;
    isDelete: boolean;
}

export interface PendingRoleWrite {
    guildId: string;
    roleId: string;
    name: string;
    color: string;
    position: number;
    permissions: string;
    managed: boolean;
    version: number;
    updatedAt: number;
    isDelete: boolean;
}

export interface PendingCheckpointWrite {
    guildId: string;
    status: string;
    memberCount: number;
    generation: number;
    lastSyncedAt: number;
    checksum?: string;
}

export class WriteManager {
    private readonly pendingMembers: Map<string, PendingMemberWrite> = new Map();
    private readonly inFlightMembers: Map<string, PendingMemberWrite> = new Map();

    private readonly pendingRoles: Map<string, PendingRoleWrite> = new Map();
    private readonly inFlightRoles: Map<string, PendingRoleWrite> = new Map();

    private readonly pendingCheckpoints: Map<string, PendingCheckpointWrite> = new Map();

    private isFlushing: boolean = false;
    private flushTimer: NodeJS.Timeout | null = null;
    private readonly batchIntervalMs: number = 200;
    private readonly maxBatchSize: number = 1000;
    private failedWritesCount: number = 0;
    private maxRetries: number = 5;

    constructor() {
        this.startPeriodicFlush();
    }

    private startPeriodicFlush(): void {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
        }
        this.flushTimer = setInterval(() => {
            void this.flush();
        }, this.batchIntervalMs);
    }

    public stop(): void {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
        }
    }

    public queueMemberWrite(write: PendingMemberWrite): void {
        const key = `${write.guildId}:${write.userId}`;
        const existing = this.pendingMembers.get(key);

        if (existing) {
            if (write.generation < existing.generation) {
                return;
            }
            if (write.generation === existing.generation && write.version < existing.version) {
                return;
            }
        }

        this.pendingMembers.set(key, write);
    }

    public queueRoleWrite(write: PendingRoleWrite): void {
        const key = `${write.guildId}:${write.roleId}`;
        const existing = this.pendingRoles.get(key);

        if (existing && write.version < existing.version) {
            return;
        }

        this.pendingRoles.set(key, write);
    }

    public queueCheckpointWrite(write: PendingCheckpointWrite): void {
        this.pendingCheckpoints.set(write.guildId, write);
    }

    public getPendingMemberCount(): number {
        return this.pendingMembers.size;
    }

    public getPendingRoleCount(): number {
        return this.pendingRoles.size;
    }

    public getFailedWritesCount(): number {
        return this.failedWritesCount;
    }

    public async flush(): Promise<void> {
        if (this.isFlushing) {
            return;
        }

        if (this.pendingMembers.size === 0 && this.pendingRoles.size === 0 && this.pendingCheckpoints.size === 0) {
            return;
        }

        this.isFlushing = true;

        try {
            await this.flushMembers();
            await this.flushRoles();
            await this.flushCheckpoints();
        } catch (error) {
            this.failedWritesCount += 1;
        } finally {
            this.isFlushing = false;
        }
    }

    private async flushMembers(): Promise<void> {
        if (this.pendingMembers.size === 0) {
            return;
        }

        const entriesToFlush = Array.from(this.pendingMembers.entries()).slice(0, this.maxBatchSize);
        const operations: AnyBulkWriteOperation<IMemberDocument>[] = [];

        for (const [key, item] of entriesToFlush) {
            this.inFlightMembers.set(key, item);
            this.pendingMembers.delete(key);

            if (item.isDelete) {
                operations.push({
                    deleteOne: {
                        filter: {
                            guildId: item.guildId,
                            userId: item.userId,
                            version: { $lte: item.version }
                        }
                    }
                });
            } else {
                operations.push({
                    updateOne: {
                        filter: {
                            guildId: item.guildId,
                            userId: item.userId,
                            version: { $lt: item.version }
                        },
                        update: {
                            $set: {
                                roleIds: item.roleIds,
                                rolesBitfield: item.rolesBitfield,
                                joinedAt: item.joinedAt,
                                updatedAt: item.updatedAt,
                                version: item.version
                            },
                            $setOnInsert: {
                                guildId: item.guildId,
                                userId: item.userId
                            }
                        },
                        upsert: true
                    }
                });
            }
        }

        if (operations.length === 0) {
            return;
        }

        try {
            await MemberModel.bulkWrite(operations, { ordered: false });
            for (const [key] of entriesToFlush) {
                this.inFlightMembers.delete(key);
            }
        } catch (error) {
            this.failedWritesCount += 1;
            for (const [key, inFlight] of entriesToFlush) {
                this.inFlightMembers.delete(key);
                const currentPending = this.pendingMembers.get(key);
                if (!currentPending || currentPending.version <= inFlight.version) {
                    this.pendingMembers.set(key, inFlight);
                }
            }
        }
    }

    private async flushRoles(): Promise<void> {
        if (this.pendingRoles.size === 0) {
            return;
        }

        const entriesToFlush = Array.from(this.pendingRoles.entries()).slice(0, this.maxBatchSize);
        const operations: AnyBulkWriteOperation<IRoleDocument>[] = [];

        for (const [key, item] of entriesToFlush) {
            this.inFlightRoles.set(key, item);
            this.pendingRoles.delete(key);

            if (item.isDelete) {
                operations.push({
                    deleteOne: {
                        filter: {
                            guildId: item.guildId,
                            roleId: item.roleId
                        }
                    }
                });
            } else {
                operations.push({
                    updateOne: {
                        filter: {
                            guildId: item.guildId,
                            roleId: item.roleId
                        },
                        update: {
                            $set: {
                                name: item.name,
                                color: item.color,
                                position: item.position,
                                permissions: item.permissions,
                                managed: item.managed,
                                version: item.version,
                                updatedAt: item.updatedAt
                            },
                            $setOnInsert: {
                                guildId: item.guildId,
                                roleId: item.roleId
                            }
                        },
                        upsert: true
                    }
                });
            }
        }

        if (operations.length === 0) {
            return;
        }

        try {
            await RoleModel.bulkWrite(operations, { ordered: false });
            for (const [key] of entriesToFlush) {
                this.inFlightRoles.delete(key);
            }
        } catch (error) {
            this.failedWritesCount += 1;
            for (const [key, inFlight] of entriesToFlush) {
                this.inFlightRoles.delete(key);
                const currentPending = this.pendingRoles.get(key);
                if (!currentPending || currentPending.version <= inFlight.version) {
                    this.pendingRoles.set(key, inFlight);
                }
            }
        }
    }

    private async flushCheckpoints(): Promise<void> {
        if (this.pendingCheckpoints.size === 0) {
            return;
        }

        const entriesToFlush = Array.from(this.pendingCheckpoints.entries()).slice(0, this.maxBatchSize);
        const operations: AnyBulkWriteOperation<ISyncCheckpointDocument>[] = [];

        for (const [, item] of entriesToFlush) {
            operations.push({
                updateOne: {
                    filter: { guildId: item.guildId },
                    update: {
                        $set: {
                            status: item.status,
                            memberCount: item.memberCount,
                            generation: item.generation,
                            lastSyncedAt: item.lastSyncedAt,
                            checksum: item.checksum
                        },
                        $setOnInsert: { guildId: item.guildId }
                    },
                    upsert: true
                }
            });
        }

        for (const [key] of entriesToFlush) {
            this.pendingCheckpoints.delete(key);
        }

        if (operations.length > 0) {
            try {
                await SyncCheckpointModel.bulkWrite(operations, { ordered: false });
            } catch (error) {
                this.failedWritesCount += 1;
            }
        }
    }

    public async shutdown(): Promise<void> {
        this.stop();
        while (this.pendingMembers.size > 0 || this.pendingRoles.size > 0 || this.pendingCheckpoints.size > 0) {
            await this.flush();
        }
    }

    public clear(): void {
        this.pendingMembers.clear();
        this.inFlightMembers.clear();
        this.pendingRoles.clear();
        this.inFlightRoles.clear();
        this.pendingCheckpoints.clear();
    }
}

export const writeManager = new WriteManager();
