import { Request, Response } from 'express';
import { stateStore } from '../../state/StateStore.js';
import { memberIndex } from '../../cache/MemberIndex.js';
import { SingleFlight } from '../../utils/singleFlight.js';
import { userGuildStatsRepository } from '../../database/repositories/UserGuildStatsRepository.js';
import { voiceSessionRepository } from '../../database/repositories/VoiceSessionRepository.js';
import { discordVoiceService } from '../../discord/services/discordVoice.service.js';

const singleFlight = new SingleFlight();
const SNOWFLAKE_RE = /^\d{17,20}$/;

export class VoiceController {
    getTopVoice(req: Request, res: Response): void {
        res.status(200).json(discordVoiceService.getTopVoiceServers(Number(req.query.limit) || 100));
    }

    getRoleVoice(req: Request, res: Response): void {
        const guildId = req.query.guildId as string;
        const roleId = req.query.roleId as string;
        const data = guildId && roleId ? discordVoiceService.getRoleVoiceMembers(guildId, roleId) : null;
        res.status(data ? 200 : 400).json(data || { success: false, error: 'guildId and roleId are required' });
    }

    async getActiveSessions(req: Request, res: Response): Promise<void> {
        try {
            const { guildId } = req.params;
            if (!guildId || !SNOWFLAKE_RE.test(guildId)) {
                res.status(400).json({ success: false, error: 'Invalid or missing guildId' });
                return;
            }

            const guildSessions = stateStore.getSessionsByGuild(guildId);
            const data = guildSessions.map((session) => ({
                userId: session.userId,
                guildId: session.guildId,
                channelId: session.channelId,
                joinedAt: session.joinedAt,
                durationMs: session.durationMs + (Date.now() - session.lastActivityAt),
            }));

            res.status(200).json({ success: true, count: data.length, data });
        } catch (error) {
            console.error('[VoiceController] getActiveSessions error:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }

    async getUserSession(req: Request, res: Response): Promise<void> {
        try {
            const { userId, guildId } = req.params;
            if (!userId || !guildId || !SNOWFLAKE_RE.test(userId) || !SNOWFLAKE_RE.test(guildId)) {
                res.status(400).json({ success: false, error: 'Invalid or missing userId or guildId' });
                return;
            }

            const session = stateStore.getActiveSession(userId, guildId);
            if (!session) {
                res.status(404).json({ success: false, error: 'No active session found' });
                return;
            }

            res.status(200).json({
                success: true,
                data: {
                    userId: session.userId,
                    guildId: session.guildId,
                    channelId: session.channelId,
                    joinedAt: session.joinedAt,
                    durationMs: session.durationMs + (Date.now() - session.lastActivityAt),
                },
            });
        } catch (error) {
            console.error('[VoiceController] getUserSession error:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }

    async getUserAnalytics(req: Request, res: Response): Promise<void> {
        try {
            const { userId, guildId } = req.params;
            if (!userId || !guildId || !SNOWFLAKE_RE.test(userId) || !SNOWFLAKE_RE.test(guildId)) {
                res.status(400).json({ success: false, error: 'Invalid or missing userId or guildId' });
                return;
            }

            const member = memberIndex.getMember(userId, guildId);
            const vRecord = memberIndex.getVoiceRecord(userId, guildId);

            if (member) {
                const session = stateStore.getActiveSession(userId, guildId);
                res.status(200).json({
                    success: true,
                    data: {
                        userId: member.userId,
                        guildId: member.guildId,
                        voiceChannelId: vRecord?.channelId || null,
                        rolesBitfield: member.rolesBitfield,
                        joinedTimestamp: member.joinedTimestamp,
                        currentSessionDurationMs: session ? session.durationMs + (Date.now() - session.lastActivityAt) : 0,
                        isActive: session !== null || vRecord !== null,
                    },
                });
                return;
            }

            const data = await singleFlight.do(`user:analytics:${userId}:${guildId}`, async () => {
                const [stats, session] = await Promise.all([
                    userGuildStatsRepository.getUserStats(userId, guildId),
                    voiceSessionRepository.getActiveSession(userId, guildId),
                ]);

                return {
                    userId,
                    guildId,
                    voiceChannelId: session?.channelId || null,
                    rolesBitfield: '',
                    joinedTimestamp: stats?.createdAt?.getTime() || 0,
                    currentSessionDurationMs: 0,
                    isActive: session !== null,
                    totalDurationSeconds: stats?.durationSeconds || 0,
                    sessionCount: stats?.sessionCount ?? 0,
                };
            });

            res.status(200).json({ success: true, data });
        } catch (error) {
            console.error('[VoiceController] getUserAnalytics error:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }

    async getGuildVoiceStats(req: Request, res: Response): Promise<void> {
        try {
            const { guildId } = req.params;
            if (!guildId || !SNOWFLAKE_RE.test(guildId)) {
                res.status(400).json({ success: false, error: 'Invalid or missing guildId' });
                return;
            }

            const guildSessions = stateStore.getSessionsByGuild(guildId);

            res.status(200).json({
                success: true,
                data: {
                    guildId,
                    activeSessionCount: guildSessions.length,
                    totalVoiceMembers: guildSessions.length,
                    sessions: guildSessions.map((session) => ({
                        userId: session.userId,
                        channelId: session.channelId,
                        durationMs: session.durationMs + (Date.now() - session.lastActivityAt),
                    })),
                },
            });
        } catch (error) {
            console.error('[VoiceController] getGuildVoiceStats error:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }

    async getChannelMembers(req: Request, res: Response): Promise<void> {
        try {
            const { channelId } = req.params;
            if (!channelId || !SNOWFLAKE_RE.test(channelId)) {
                res.status(400).json({ success: false, error: 'Invalid or missing channelId' });
                return;
            }

            const allSessions = stateStore.getAllSessions();
            const channelSessions = allSessions.filter(s => s.channelId === channelId);

            const data = channelSessions.map((s) => {
                const member = memberIndex.getMember(s.userId, s.guildId);
                return {
                    userId: s.userId,
                    guildId: s.guildId,
                    rolesBitfield: member?.rolesBitfield || '0',
                    joinedTimestamp: member?.joinedTimestamp || s.joinedAt,
                    currentDurationMs: s.durationMs + (Date.now() - s.lastActivityAt),
                };
            });

            res.status(200).json({ success: true, count: data.length, data });
        } catch (error) {
            console.error('[VoiceController] getChannelMembers error:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }
}

export const voiceController = new VoiceController();
