import mongoose from "mongoose";
import { StateStore, SessionDelta, StatsDelta, stateStore } from "../../state/StateStore.js";
import { VoiceSessionRepository, VoiceSessionInput, voiceSessionRepository } from "../../database/repositories/VoiceSessionRepository.js";
import { UserGuildStatsRepository, UserGuildStatsInput, userGuildStatsRepository } from "../../database/repositories/UserGuildStatsRepository.js";
import { ProcessedEventModel } from "../../database/models/ProcessedEvent.model.js";
import { eventJournal } from "../../state/EventJournal.js";

interface RetryItem<T> {
    item: T;
    retries: number;
}

export class SyncWorker {
    private stateStore: StateStore;
    private voiceSessionRepository: VoiceSessionRepository;
    private userGuildStatsRepository: UserGuildStatsRepository;
    private interval: NodeJS.Timeout | null = null;
    private retrySessionQueue: RetryItem<SessionDelta>[] = [];
    private retryStatsQueue: RetryItem<StatsDelta>[] = [];
    private readonly flushInterval = 2000;
    private readonly batchSize = 1000;
    private readonly maxRetries = 20;
    private replicaSetAvailable: boolean | null = null;

    constructor(
        stateStore: StateStore,
        voiceSessionRepository: VoiceSessionRepository,
        userGuildStatsRepository: UserGuildStatsRepository
    ) {
        this.stateStore = stateStore;
        this.voiceSessionRepository = voiceSessionRepository;
        this.userGuildStatsRepository = userGuildStatsRepository;
    }

    public start(): void {
        if (this.interval) return;
        this.interval = setInterval(() => {
            this.flush().catch((err) => console.error("[SyncWorker] Periodic flush error:", err));
        }, this.flushInterval);
    }

    public async recoverFromJournal(): Promise<void> {
        try {
            const events = await eventJournal.readAll();
            if (events.length === 0) return;
            console.log(`[SyncWorker] Replaying ${events.length} uncommitted journal events...`);
            for (const event of events) {
                stateStore.recordVoiceUpdate(event.userId, event.guildId, event.channelId, event.occurredAt);
            }
            await this.flush();
        } catch (err) {
            console.error("[SyncWorker] Journal recovery error:", err);
        }
    }

    public async stop(): Promise<void> {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        try {
            await this.flush();
        } catch (err) {
            console.error("[SyncWorker] Error during shutdown flush:", err);
        }
    }

    public async flush(): Promise<void> {
        if (this.stateStore.getFlushing()) return;
        this.stateStore.setFlushing(true);
        try {
            await this.processRetryQueues();
            await this.processBuffer();
        } catch (error) {
            console.error("[SyncWorker] Flush error:", error);
        } finally {
            this.stateStore.setFlushing(false);
        }
    }

    private async detectReplicaSet(): Promise<boolean> {
        if (this.replicaSetAvailable !== null) return this.replicaSetAvailable;
        try {
            const session = await mongoose.startSession();
            await session.endSession();
            this.replicaSetAvailable = true;
        } catch {
            this.replicaSetAvailable = false;
        }
        return this.replicaSetAvailable;
    }

    private async processRetryQueues(): Promise<void> {
        if (this.retrySessionQueue.length > 0) {
            const retryBatch = this.retrySessionQueue.splice(0, this.batchSize);
            try {
                await this.processSessionDeltas(retryBatch.map((r) => r.item));
            } catch (err) {
                console.error("[SyncWorker] Error retrying session deltas:", err);
                for (const item of retryBatch) {
                    if (item.retries < this.maxRetries) {
                        this.retrySessionQueue.push({ item: item.item, retries: item.retries + 1 });
                    } else {
                        console.error(`[SyncWorker] Dropped session delta after ${this.maxRetries} retries:`, item.item.eventId);
                    }
                }
            }
        }

        if (this.retryStatsQueue.length > 0) {
            const retryBatch = this.retryStatsQueue.splice(0, this.batchSize);
            try {
                await this.processStatsDeltas(retryBatch.map((r) => r.item));
            } catch (err) {
                console.error("[SyncWorker] Error retrying stats deltas:", err);
                for (const item of retryBatch) {
                    if (item.retries < this.maxRetries) {
                        this.retryStatsQueue.push({ item: item.item, retries: item.retries + 1 });
                    } else {
                        console.error(`[SyncWorker] Dropped stats delta after ${this.maxRetries} retries:`, item.item.eventId);
                    }
                }
            }
        }
    }

    private async processBuffer(): Promise<void> {
        while (this.stateStore.getBufferSize() > 0) {
            const batch = this.stateStore.drainBuffer(this.batchSize);
            if (batch.length === 0) break;
            await this.processBatch(batch);
        }
    }

    private async processBatch(batch: (SessionDelta | StatsDelta)[]): Promise<void> {
        const sessionDeltas = batch.filter((item): item is SessionDelta => "deltaMs" in item);
        const statsDeltas = batch.filter((item): item is StatsDelta => !("deltaMs" in item));
        const compactIds = new Set<string>();

        if (sessionDeltas.length > 0) {
            try {
                await this.processSessionDeltas(sessionDeltas);
                for (const d of sessionDeltas) if (d.eventId) compactIds.add(d.eventId);
            } catch (error) {
                console.error("[SyncWorker] Error saving session deltas, queuing retry:", error);
                for (const s of sessionDeltas) this.retrySessionQueue.push({ item: s, retries: 1 });
            }
        }

        if (statsDeltas.length > 0) {
            try {
                await this.processStatsDeltas(statsDeltas);
                for (const d of statsDeltas) if (d.eventId) compactIds.add(d.eventId);
            } catch (error) {
                console.error("[SyncWorker] Error saving stats deltas, queuing retry:", error);
                for (const s of statsDeltas) this.retryStatsQueue.push({ item: s, retries: 1 });
            }
        }

        if (compactIds.size > 0) {
            void eventJournal.compactProcessed(compactIds).catch(() => {});
        }
    }

    private async processSessionDeltas(deltas: SessionDelta[]): Promise<void> {
        if (deltas.length === 0) return;

        const userEventsMap = new Map<string, SessionDelta[]>();
        for (const delta of deltas) {
            const key = `${delta.userId}:${delta.guildId}`;
            let list = userEventsMap.get(key);
            if (!list) {
                list = [];
                userEventsMap.set(key, list);
            }
            list.push(delta);
        }

        const deletes: { userId: string; guildId: string }[] = [];
        const upserts: VoiceSessionInput[] = [];

        for (const [, events] of userEventsMap) {
            const lastEvent = events[events.length - 1];
            const hasIntermediateLeave = events.some((e) => e.isLeave);

            if (lastEvent.isLeave) {
                deletes.push({ userId: lastEvent.userId, guildId: lastEvent.guildId });
            } else {
                if (hasIntermediateLeave) {
                    deletes.push({ userId: lastEvent.userId, guildId: lastEvent.guildId });
                }
                upserts.push({
                    userId: lastEvent.userId,
                    guildId: lastEvent.guildId,
                    channelId: lastEvent.channelId,
                    startedAt: lastEvent.startedAt ? new Date(lastEvent.startedAt) : new Date(lastEvent.timestamp),
                    lastUpdated: new Date(lastEvent.timestamp)
                });
            }
        }

        if (deletes.length > 0) await this.voiceSessionRepository.bulkDelete(deletes);
        if (upserts.length > 0) await this.voiceSessionRepository.bulkUpsert(upserts);
    }

    private async processStatsDeltas(deltas: StatsDelta[]): Promise<void> {
        if (deltas.length === 0) return;

        const eventIds = deltas.map((d) => d.eventId).filter(Boolean);
        let alreadyProcessedSet = new Set<string>();

        if (eventIds.length > 0) {
            try {
                const found = await ProcessedEventModel.find({ eventId: { $in: eventIds } }).lean();
                alreadyProcessedSet = new Set(found.map((f) => f.eventId));
            } catch (err) {
                console.warn("[SyncWorker] Could not check processed events, proceeding:", err);
            }
        }

        const unprocessedDeltas = deltas.filter((d) => !alreadyProcessedSet.has(d.eventId));
        if (unprocessedDeltas.length === 0) return;

        const statsMap = new Map<string, UserGuildStatsInput>();
        for (const delta of unprocessedDeltas) {
            const key = `${delta.userId}:${delta.guildId}`;
            const existing = statsMap.get(key);
            if (existing) {
                existing.durationSeconds += Math.floor(delta.sessionDurationMs / 1000);
                existing.sessionCount = (existing.sessionCount || 0) + delta.sessionCount;
                existing.lastSeen = new Date(delta.timestamp);
            } else {
                statsMap.set(key, {
                    userId: delta.userId,
                    guildId: delta.guildId,
                    durationSeconds: Math.floor(delta.sessionDurationMs / 1000),
                    messageCount: 0,
                    sessionCount: delta.sessionCount,
                    lastSeen: new Date(delta.timestamp)
                });
            }
        }

        if (statsMap.size === 0) return;

        const eventDocs = unprocessedDeltas.filter((d) => d.eventId).map((d) => ({ eventId: d.eventId }));
        const useReplicaSet = await this.detectReplicaSet();

        if (useReplicaSet) {
            const session = await mongoose.startSession();
            try {
                await session.withTransaction(async () => {
                    await this.userGuildStatsRepository.bulkUpsert(Array.from(statsMap.values()));
                    if (eventDocs.length > 0) {
                        await ProcessedEventModel.insertMany(eventDocs, { ordered: false, session });
                    }
                });
            } catch {
                await this.userGuildStatsRepository.bulkUpsert(Array.from(statsMap.values()));
                if (eventDocs.length > 0) {
                    await ProcessedEventModel.insertMany(eventDocs, { ordered: false }).catch(() => {});
                }
            } finally {
                await session.endSession().catch(() => {});
            }
        } else {
            await this.userGuildStatsRepository.bulkUpsert(Array.from(statsMap.values()));
            if (eventDocs.length > 0) {
                await ProcessedEventModel.insertMany(eventDocs, { ordered: false }).catch(() => {});
            }
        }
    }

    public getRetryQueueSize(): number {
        return this.retrySessionQueue.length + this.retryStatsQueue.length;
    }
}

export const syncWorker = new SyncWorker(stateStore, voiceSessionRepository, userGuildStatsRepository);
