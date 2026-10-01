import crypto from "crypto";
import { StateStore, VoiceSession, SessionDelta, StatsDelta } from "../../state/StateStore.js";
import { voiceCompanionRepository } from "../../database/repositories/VoiceCompanionRepository.js";

let stateStoreInstance: StateStore | null = null;

export class VoiceService {
    public setStateStore(store: StateStore): void {
        stateStoreInstance = store;
    }

    public handleVoiceJoin(userId: string, guildId: string, channelId: string): void {
        if (!stateStoreInstance) return;

        const now = Date.now();
        const existingSession = stateStoreInstance.getActiveSession(userId, guildId);

        if (existingSession) {
            const deltaMs = Math.max(0, now - existingSession.lastActivityAt);
            existingSession.lastActivityAt = now;
            existingSession.durationMs += deltaMs;

            const previousChannelId = existingSession.channelId;

            stateStoreInstance.enqueueDelta({
                eventId: crypto.randomUUID(),
                userId,
                guildId,
                channelId: existingSession.channelId,
                startedAt: existingSession.joinedAt,
                deltaMs,
                timestamp: now,
                isLeave: false
            });

            if (previousChannelId !== channelId) {
                void this.recordCompanionOverlap(userId, guildId, previousChannelId, existingSession.joinedAt, now).catch(() => {});
                existingSession.channelId = channelId;
            }
        } else {
            stateStoreInstance.setActiveSession({
                userId,
                guildId,
                channelId,
                joinedAt: now,
                lastActivityAt: now,
                durationMs: 0
            });

            stateStoreInstance.enqueueDelta({
                eventId: crypto.randomUUID(),
                userId,
                guildId,
                channelId,
                startedAt: now,
                deltaMs: 0,
                timestamp: now,
                isLeave: false
            });
        }
    }

    public handleVoiceLeave(userId: string, guildId: string): void {
        if (!stateStoreInstance) return;

        const session = stateStoreInstance.getActiveSession(userId, guildId);
        if (!session) return;

        const now = Date.now();
        const deltaMs = Math.max(0, now - session.lastActivityAt);
        session.durationMs += deltaMs;

        const channelId = session.channelId;
        const leavingJoinedAt = session.joinedAt;

        stateStoreInstance.enqueueDelta({
            eventId: crypto.randomUUID(),
            userId,
            guildId,
            channelId: session.channelId,
            startedAt: session.joinedAt,
            deltaMs,
            timestamp: now,
            isLeave: true
        });

        stateStoreInstance.enqueueDelta({
            eventId: crypto.randomUUID(),
            userId,
            guildId,
            sessionDurationMs: session.durationMs,
            sessionCount: 1,
            timestamp: now
        } as StatsDelta);

        void this.recordCompanionOverlap(userId, guildId, channelId, leavingJoinedAt, now).catch(() => {});

        stateStoreInstance.removeActiveSession(userId, guildId);
    }

    private async recordCompanionOverlap(
        leavingUserId: string,
        guildId: string,
        channelId: string,
        leavingJoinedAt: number,
        now: number
    ): Promise<void> {
        if (!stateStoreInstance) return;

        const companionsInChannel = stateStoreInstance.getAllActiveSessions().filter(
            (s) => s.guildId === guildId && s.channelId === channelId && s.userId !== leavingUserId
        );

        for (const companion of companionsInChannel) {
            const overlapStart = Math.max(leavingJoinedAt, companion.joinedAt);
            const overlapDurationSeconds = Math.max(0, Math.floor((now - overlapStart) / 1000));

            if (overlapDurationSeconds > 0) {
                await Promise.all([
                    voiceCompanionRepository.incrementSharedDuration(leavingUserId, companion.userId, guildId, overlapDurationSeconds),
                    voiceCompanionRepository.incrementSharedDuration(companion.userId, leavingUserId, guildId, overlapDurationSeconds)
                ]).catch(() => {});
            }
        }
    }

    public handleVoiceMove(userId: string, guildId: string, newChannelId: string): void {
        this.handleVoiceJoin(userId, guildId, newChannelId);
    }

    public calculateCurrentDuration(userId: string, guildId: string): number {
        if (!stateStoreInstance) return 0;
        const session = stateStoreInstance.getActiveSession(userId, guildId);
        if (!session) return 0;
        return session.durationMs + Math.max(0, Date.now() - session.lastActivityAt);
    }

    public getActiveSession(userId: string, guildId: string): VoiceSession | null {
        return stateStoreInstance?.getActiveSession(userId, guildId) ?? null;
    }

    public getAllActiveSessions(): VoiceSession[] {
        return stateStoreInstance?.getAllActiveSessions() ?? [];
    }
}

export const voiceService = new VoiceService();
