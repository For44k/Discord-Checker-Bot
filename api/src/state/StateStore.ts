import crypto from "crypto";
import { eventJournal, EventJournal } from "./EventJournal.js";

export interface VoiceSession {
    userId: string;
    guildId: string;
    channelId: string;
    joinedAt: number;
    lastActivityAt: number;
    durationMs: number;
}

export interface SessionDelta {
    eventId: string;
    userId: string;
    guildId: string;
    channelId: string;
    startedAt?: number;
    deltaMs: number;
    timestamp: number;
    isLeave?: boolean;
}

export interface StatsDelta {
    eventId: string;
    userId: string;
    guildId: string;
    sessionDurationMs: number;
    sessionCount: number;
    timestamp: number;
}

class CircularBuffer {
    private buffer: (SessionDelta | StatsDelta | undefined)[];
    private head = 0;
    private tail = 0;
    private count = 0;
    private readonly capacity: number;

    constructor(capacity: number) {
        this.capacity = capacity;
        this.buffer = new Array(capacity).fill(undefined);
    }

    public push(item: SessionDelta | StatsDelta): boolean {
        if (this.count >= this.capacity) {
            this.buffer[this.head] = item;
            this.head = (this.head + 1) % this.capacity;
            return false;
        }
        this.buffer[this.tail] = item;
        this.tail = (this.tail + 1) % this.capacity;
        this.count += 1;
        return true;
    }

    public drain(count: number = this.count): (SessionDelta | StatsDelta)[] {
        const n = Math.min(count, this.count);
        const result: (SessionDelta | StatsDelta)[] = [];
        for (let i = 0; i < n; i++) {
            const item = this.buffer[this.head];
            if (item !== undefined) {
                result.push(item);
            }
            this.buffer[this.head] = undefined;
            this.head = (this.head + 1) % this.capacity;
            this.count -= 1;
        }
        return result;
    }

    public get size(): number {
        return this.count;
    }
}

export class StateStore {
    private activeSessions: Map<string, VoiceSession> = new Map();
    private userIndex: Map<string, Set<string>> = new Map();
    private ringBuffer: CircularBuffer;
    private isFlushing = false;
    private droppedEventsCount = 0;
    private journal: EventJournal;

    constructor(journal: EventJournal = eventJournal) {
        this.journal = journal;
        this.ringBuffer = new CircularBuffer(50000);
    }

    public getActiveSession(userId: string, guildId: string): VoiceSession | null {
        return this.activeSessions.get(`${userId}:${guildId}`) ?? null;
    }

    public setActiveSession(session: VoiceSession): void {
        const key = `${session.userId}:${session.guildId}`;
        this.activeSessions.set(key, session);
        let userKeys = this.userIndex.get(session.userId);
        if (!userKeys) {
            userKeys = new Set();
            this.userIndex.set(session.userId, userKeys);
        }
        userKeys.add(key);
    }

    public removeActiveSession(userId: string, guildId: string): boolean {
        const key = `${userId}:${guildId}`;
        const existed = this.activeSessions.delete(key);
        if (existed) {
            const userKeys = this.userIndex.get(userId);
            if (userKeys) {
                userKeys.delete(key);
                if (userKeys.size === 0) this.userIndex.delete(userId);
            }
        }
        return existed;
    }

    public getAllActiveSessions(): VoiceSession[] {
        return Array.from(this.activeSessions.values());
    }

    public getSessionsByGuild(guildId: string): VoiceSession[] {
        const result: VoiceSession[] = [];
        for (const session of this.activeSessions.values()) {
            if (session.guildId === guildId) result.push(session);
        }
        return result;
    }

    public enqueueDelta(delta: SessionDelta | StatsDelta): boolean {
        const accepted = this.ringBuffer.push(delta);
        if (!accepted) {
            this.droppedEventsCount += 1;
            if (this.droppedEventsCount % 100 === 1) {
                console.warn(`[StateStore] Buffer full. Dropped ${this.droppedEventsCount} oldest events.`);
            }
        }
        return accepted;
    }

    public drainBuffer(count?: number): (SessionDelta | StatsDelta)[] {
        return this.ringBuffer.drain(count);
    }

    public getBufferSize(): number {
        return this.ringBuffer.size;
    }

    public getDroppedEventsCount(): number {
        return this.droppedEventsCount;
    }

    public setFlushing(isFlushing: boolean): void {
        this.isFlushing = isFlushing;
    }

    public getFlushing(): boolean {
        return this.isFlushing;
    }

    public getAllSessions(): VoiceSession[] {
        return Array.from(this.activeSessions.values());
    }

    public getUserVoiceChannel(userId: string): Map<string, string> {
        const channels = new Map<string, string>();
        const userKeys = this.userIndex.get(userId);
        if (!userKeys) return channels;
        for (const key of userKeys) {
            const session = this.activeSessions.get(key);
            if (session) channels.set(session.guildId, session.channelId);
        }
        return channels;
    }

    public restoreActiveSession(session: {
        userId: string;
        guildId: string;
        channelId: string;
        startedAt: number;
        lastActivityAt?: number;
        durationMs?: number;
    }): void {
        const key = `${session.userId}:${session.guildId}`;
        const now = Date.now();
        const existing = this.activeSessions.get(key);

        if (existing) {
            existing.channelId = session.channelId;
            existing.joinedAt = session.startedAt;
            return;
        }

        this.setActiveSession({
            userId: session.userId,
            guildId: session.guildId,
            channelId: session.channelId,
            joinedAt: session.startedAt,
            lastActivityAt: session.lastActivityAt ?? now,
            durationMs: session.durationMs ?? 0
        });
    }

    public restoreObservedSession(session: {
        userId: string;
        guildId: string;
        channelId: string;
        startedAt: number;
        accumulatedDurationMs?: number;
    }): void {
        this.setActiveSession({
            userId: session.userId,
            guildId: session.guildId,
            channelId: session.channelId,
            joinedAt: session.startedAt,
            lastActivityAt: Date.now(),
            durationMs: session.accumulatedDurationMs ?? 0
        });
    }

    public reconcileActiveSessions(now: number = Date.now(), disconnectedAt?: number): void {
        for (const session of this.activeSessions.values()) {
            if (disconnectedAt && disconnectedAt > session.lastActivityAt) {
                session.durationMs += disconnectedAt - session.lastActivityAt;
            }
            session.lastActivityAt = now;
        }
    }

    public clear(): void {
        this.activeSessions.clear();
        this.userIndex.clear();
        this.ringBuffer = new CircularBuffer(50000);
        this.droppedEventsCount = 0;
        this.isFlushing = false;
    }

    public recordVoiceUpdate(userId: string, guildId: string, channelId: string | null, startedAtOverride?: number): void {
        const key = `${userId}:${guildId}`;
        const existingSession = this.activeSessions.get(key);
        const now = Date.now();
        const eventId = crypto.randomUUID();

        if (channelId) {
            if (existingSession) {
                const deltaMs = Math.max(0, now - existingSession.lastActivityAt);
                existingSession.lastActivityAt = now;
                existingSession.durationMs += deltaMs;
                existingSession.channelId = channelId;

                this.enqueueDelta({
                    eventId,
                    userId,
                    guildId,
                    channelId,
                    startedAt: existingSession.joinedAt,
                    deltaMs,
                    timestamp: now,
                    isLeave: false
                });
            } else {
                const initialJoinedAt = startedAtOverride ?? now;
                this.setActiveSession({
                    userId,
                    guildId,
                    channelId,
                    joinedAt: initialJoinedAt,
                    lastActivityAt: now,
                    durationMs: 0
                });

                this.enqueueDelta({
                    eventId,
                    userId,
                    guildId,
                    channelId,
                    startedAt: initialJoinedAt,
                    deltaMs: 0,
                    timestamp: now,
                    isLeave: false
                });
            }
        } else {
            if (existingSession) {
                const deltaMs = Math.max(0, now - existingSession.lastActivityAt);
                existingSession.durationMs += deltaMs;

                this.enqueueDelta({
                    eventId,
                    userId,
                    guildId,
                    channelId: existingSession.channelId,
                    startedAt: existingSession.joinedAt,
                    deltaMs,
                    timestamp: now,
                    isLeave: true
                });

                this.enqueueDelta({
                    eventId: crypto.randomUUID(),
                    userId,
                    guildId,
                    sessionDurationMs: existingSession.durationMs,
                    sessionCount: 1,
                    timestamp: now
                } as StatsDelta);

                this.removeActiveSession(userId, guildId);
            }
        }
    }
}

export const stateStore = new StateStore();
