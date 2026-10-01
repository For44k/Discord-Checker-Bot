export interface SessionState {
    userId: string;
    guildId: string;
    channelId: string;
    startedAt: number;
    lastUpdated: number;
    channelStartedAt: number;
    accumulatedDurationMs: number;
}

export interface TransitionResult {
    session: SessionState | null;
    durationToFinalizeMs?: number;
    channelForCompanion?: string;
    channelStartedAt?: number;
}

export function transition(
    state: SessionState | null,
    event: { type: "join" | "move" | "leave"; channelId: string | null; occurredAt: number },
    ids: { userId: string; guildId: string }
): TransitionResult {
    if (event.type === "join") {
        if (state) {
            return { session: state };
        }
        const effectiveChannelId = event.channelId || "default_channel";
        return {
            session: {
                userId: ids.userId,
                guildId: ids.guildId,
                channelId: effectiveChannelId,
                startedAt: event.occurredAt,
                lastUpdated: event.occurredAt,
                channelStartedAt: event.occurredAt,
                accumulatedDurationMs: 0
            }
        };
    }

    if (!state) {
        if (!event.channelId) {
            return { session: null };
        }
        return {
            session: {
                userId: ids.userId,
                guildId: ids.guildId,
                channelId: event.channelId,
                startedAt: event.occurredAt,
                lastUpdated: event.occurredAt,
                channelStartedAt: event.occurredAt,
                accumulatedDurationMs: 0
            }
        };
    }

    const delta = Math.max(0, event.occurredAt - state.lastUpdated);

    if (event.type === "move") {
        const nextChannel = event.channelId || state.channelId;
        return {
            session: {
                ...state,
                channelId: nextChannel,
                lastUpdated: event.occurredAt,
                channelStartedAt: nextChannel === state.channelId ? state.channelStartedAt : event.occurredAt,
                accumulatedDurationMs: state.accumulatedDurationMs + delta
            },
            channelForCompanion: nextChannel === state.channelId ? undefined : state.channelId,
            channelStartedAt: state.channelStartedAt
        };
    }

    return {
        session: null,
        durationToFinalizeMs: state.accumulatedDurationMs + delta,
        channelForCompanion: state.channelId,
        channelStartedAt: state.channelStartedAt
    };
}
