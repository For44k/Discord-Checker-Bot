import { userGuildStatsRepository } from '../../database/repositories/UserGuildStatsRepository.js';
import { voiceCompanionRepository } from '../../database/repositories/VoiceCompanionRepository.js';
import { voiceSessionRepository } from '../../database/repositories/VoiceSessionRepository.js';
import { MemoryCache } from '../../cache/MemoryCache.js';
import { calculateDuration } from '../calculators/durationCalculator.js';

export interface DeepAnalyticsResult {
    userId: string;
    totalVoiceSeconds: number;
    totalVoiceHours: number;
    totalMessages: number;
    activeSessions: {
        guildId: string;
        channelId: string;
        elapsedSeconds: number;
    }[];
    topVoiceGuilds: {
        guildId: string;
        guildName: string | null;
        durationSeconds: number;
        durationHours: number;
    }[];
    topMessageGuilds: {
        guildId: string;
        guildName: string | null;
        messageCount: number;
    }[];
    topCompanions: {
        companionId: string;
        sharedDurationSeconds: number;
        sharedDurationHours: number;
    }[];
}

const analyticsCache = new MemoryCache<DeepAnalyticsResult>({ ttlMs: 10000, maxEntries: 20000 });

export class UserAnalyticsService {
    async getUserAnalytics(userId: string): Promise<DeepAnalyticsResult> {
        return this.getDeepAnalytics(userId);
    }

    async getDeepAnalytics(userId: string): Promise<DeepAnalyticsResult> {
        return analyticsCache.getOrFetch(userId, async () => {
            const [guildStats, activeUserSessions, topCompanions] = await Promise.all([
                userGuildStatsRepository.getAllStatsForUser(userId),
                voiceSessionRepository.getActiveSessionsForUser(userId),
                voiceCompanionRepository.getTopCompanions(userId, 5),
            ]);

            const activeElapsedByGuild = new Map<string, { channelId: string; elapsed: number }>();
            const now = Date.now();
            let totalLiveElapsedSeconds = 0;
            const activeSessionsList: DeepAnalyticsResult['activeSessions'] = [];

            for (const session of activeUserSessions) {
                const elapsed = Math.max(0, Math.floor((now - new Date(session.startedAt).getTime()) / 1000));
                activeElapsedByGuild.set(session.guildId, { channelId: session.channelId, elapsed });
                totalLiveElapsedSeconds += elapsed;
                activeSessionsList.push({ guildId: session.guildId, channelId: session.channelId, elapsedSeconds: elapsed });
            }

            let totalStoredSeconds = 0;
            let totalMessages = 0;

            const unifiedGuildList = guildStats.map((stat) => {
                const live = activeElapsedByGuild.get(stat.guildId)?.elapsed || 0;
                const currentTotalSeconds = (stat.durationSeconds || 0) + live;
                totalStoredSeconds += stat.durationSeconds || 0;
                totalMessages += stat.messageCount || 0;
                return {
                    guildId: stat.guildId,
                    guildName: stat.guildName || null,
                    durationSeconds: currentTotalSeconds,
                    durationHours: parseFloat((currentTotalSeconds / 3600).toFixed(2)),
                    messageCount: stat.messageCount || 0,
                };
            });

            for (const session of activeUserSessions) {
                if (!guildStats.some((s) => s.guildId === session.guildId)) {
                    const live = activeElapsedByGuild.get(session.guildId)?.elapsed || 0;
                    unifiedGuildList.push({
                        guildId: session.guildId,
                        guildName: null,
                        durationSeconds: live,
                        durationHours: parseFloat((live / 3600).toFixed(2)),
                        messageCount: 0,
                    });
                }
            }

            const grandTotalVoiceSeconds = totalStoredSeconds + totalLiveElapsedSeconds;
            const grandTotalVoiceHours = parseFloat((grandTotalVoiceSeconds / 3600).toFixed(2));

            const topVoiceGuilds = unifiedGuildList
                .slice()
                .sort((a, b) => b.durationSeconds - a.durationSeconds)
                .slice(0, 5)
                .map((g) => ({
                    guildId: g.guildId,
                    guildName: g.guildName,
                    durationSeconds: g.durationSeconds,
                    durationHours: g.durationHours,
                }));

            const topMessageGuilds = unifiedGuildList
                .slice()
                .sort((a, b) => b.messageCount - a.messageCount)
                .slice(0, 5)
                .map((g) => ({
                    guildId: g.guildId,
                    guildName: g.guildName,
                    messageCount: g.messageCount,
                }));

            const formattedCompanions = topCompanions.map((c) => ({
                companionId: c.companionId,
                sharedDurationSeconds: c.sharedDurationSeconds,
                sharedDurationHours: parseFloat((c.sharedDurationSeconds / 3600).toFixed(2)),
            }));

            return {
                userId,
                totalVoiceSeconds: grandTotalVoiceSeconds,
                totalVoiceHours: grandTotalVoiceHours,
                totalMessages,
                activeSessions: activeSessionsList,
                topVoiceGuilds,
                topMessageGuilds,
                topCompanions: formattedCompanions,
            };
        });
    }
}

export const userAnalyticsService = new UserAnalyticsService();
