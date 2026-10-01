import { Request, Response } from "express";
import { userAnalyticsService } from "../../analytics/services/userAnalytics.service.js";
import { discordVoiceService } from "../../discord/services/discordVoice.service.js";
import { discordDangerService } from "../../discord/services/discordDanger.service.js";
import { discordUserService } from "../../discord/services/discordUser.service.js";
import { userGuildStatsRepository } from "../../database/repositories/UserGuildStatsRepository.js";
import { singleFlight } from "../../utils/singleFlight.js";
import { fullCheckService } from "../../services/queries/FullCheckService.js";
import { checkDeviceService } from "../../services/queries/CheckDeviceService.js";
import { checkConnectionsService } from "../../services/queries/CheckConnectionsService.js";

const SNOWFLAKE_REGEX = /^\d{17,20}$/;

export class UserController {
    public async getUserAnalytics(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.params.userId || (req.query.userId as string);
            if (!userId || !SNOWFLAKE_REGEX.test(userId)) {
                res.status(400).json({ success: false, error: "Valid snowflake userId is required" });
                return;
            }

            const data = await singleFlight.do(`analytics:${userId}`, async () => {
                return userAnalyticsService.getUserAnalytics(userId);
            });

            res.status(200).json({ success: true, data });
        } catch (error) {
            console.error("[UserController] getUserAnalytics error:", error);
            res.status(500).json({ success: false, error: "Internal server error" });
        }
    }

    public async getUserVoice(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.params.userId || (req.query.userId as string);
            if (!userId || !SNOWFLAKE_REGEX.test(userId)) {
                res.status(400).json({ success: false, error: "Valid snowflake userId is required" });
                return;
            }

            const matches = await singleFlight.do(`voice:${userId}`, async () => {
                return discordVoiceService.findUserVoiceAcrossGuilds(userId);
            });

            res.status(200).json({
                success: true,
                userId,
                inVoice: matches.length > 0,
                matches
            });
        } catch (error) {
            console.error("[UserController] getUserVoice error:", error);
            res.status(500).json({ success: false, error: "Internal server error" });
        }
    }

    public async getVoiceLeaderboard(req: Request, res: Response): Promise<void> {
        try {
            const guildId = req.params.guildId || (req.query.guildId as string);
            const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 100, 1), 1000);

            if (guildId) {
                if (!SNOWFLAKE_REGEX.test(guildId)) {
                    res.status(400).json({ success: false, error: "Valid snowflake guildId is required" });
                    return;
                }

                const data = await singleFlight.do(`leaderboard:guild:${guildId}:${limit}`, async () => {
                    const topUsers = await userGuildStatsRepository.getGuildTopUsers(guildId, limit);
                    return {
                        success: true,
                        guildId,
                        limit,
                        data: topUsers.map((user, idx) => ({
                            top: idx + 1,
                            userId: user.userId,
                            guildId: user.guildId,
                            guildName: user.guildName || null,
                            durationSeconds: user.durationSeconds,
                            durationHours: parseFloat((user.durationSeconds / 3600).toFixed(2)),
                            sessionCount: user.sessionCount || 0,
                            messageCount: user.messageCount || 0,
                            lastSeen: user.lastSeen
                        }))
                    };
                });
                res.status(200).json(data);
                return;
            }

            const data = await singleFlight.do(`leaderboard:${limit}`, async () => {
                return discordVoiceService.getTopVoiceServers(limit);
            });

            res.status(200).json(data);
        } catch (error) {
            console.error("[UserController] getVoiceLeaderboard error:", error);
            res.status(500).json({ success: false, error: "Internal server error" });
        }
    }

    public async getDangerRoles(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.params.userId || (req.query.userId as string);
            if (!userId || !SNOWFLAKE_REGEX.test(userId)) {
                res.status(400).json({ success: false, error: "Valid snowflake userId is required" });
                return;
            }

            const data = await singleFlight.do(`danger:${userId}`, async () => {
                return discordDangerService.getUserDangerRoles(userId);
            });

            res.status(200).json({ success: true, ...data });
        } catch (error) {
            console.error("[UserController] getDangerRoles error:", error);
            res.status(500).json({ success: false, error: "Internal server error" });
        }
    }

    public async getSocialShip(req: Request, res: Response): Promise<void> {
        try {
            const user1Id = req.query.user1Id as string;
            const user2Id = req.query.user2Id as string;

            if (!user1Id || !user2Id || !SNOWFLAKE_REGEX.test(user1Id) || !SNOWFLAKE_REGEX.test(user2Id)) {
                res.status(400).json({ success: false, error: "Valid snowflake user1Id and user2Id are required" });
                return;
            }

            const shipKey = [user1Id, user2Id].sort().join(":");
            const data = await singleFlight.do(`ship:${shipKey}`, async () => {
                return discordUserService.getSocialShip(user1Id, user2Id);
            });

            if (!data) {
                res.status(404).json({ success: false, error: "One or both users not found" });
                return;
            }

            res.status(200).json({ success: true, ...data });
        } catch (error) {
            console.error("[UserController] getSocialShip error:", error);
            res.status(500).json({ success: false, error: "Internal server error" });
        }
    }

    public async getUserPresence(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.params.userId || (req.query.userId as string);
            if (!userId || !SNOWFLAKE_REGEX.test(userId)) {
                res.status(400).json({ success: false, error: "Valid snowflake userId is required" });
                return;
            }

            const data = await singleFlight.do(`presence:${userId}`, async () => {
                return discordUserService.getUserPresence(userId);
            });

            res.status(200).json({ success: true, ...data });
        } catch (error) {
            console.error("[UserController] getUserPresence error:", error);
            res.status(500).json({ success: false, error: "Internal server error" });
        }
    }

    public async getUserRoles(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.params.userId || (req.query.userId as string);
            if (!userId || !SNOWFLAKE_REGEX.test(userId)) {
                res.status(400).json({ success: false, error: "Valid snowflake userId is required" });
                return;
            }

            const data = await singleFlight.do(`roles:${userId}`, async () => {
                return discordUserService.getUserRolesAcrossGuilds(userId);
            });

            res.status(200).json({ success: true, data });
        } catch (error) {
            console.error("[UserController] getUserRoles error:", error);
            res.status(500).json({ success: false, error: "Internal server error" });
        }
    }

    public async getUserProfile(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.params.userId || (req.query.userId as string);
            if (!userId || !SNOWFLAKE_REGEX.test(userId)) {
                res.status(400).json({ success: false, error: "Valid snowflake userId is required" });
                return;
            }

            const data = await singleFlight.do(`profile:${userId}`, async () => {
                return discordUserService.getUserProfile(userId);
            });

            if (!data) {
                res.status(404).json({ success: false, error: "User not found" });
                return;
            }

            res.status(200).json({ success: true, data });
        } catch (error) {
            console.error("[UserController] getUserProfile error:", error);
            res.status(500).json({ success: false, error: "Internal server error" });
        }
    }

    public async getUserFullCheck(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.params.userId || (req.query.userId as string);
            if (!userId || !SNOWFLAKE_REGEX.test(userId)) {
                res.status(400).json({ success: false, error: "Valid snowflake userId is required" });
                return;
            }

            const result = fullCheckService.execute(userId);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            console.error("[UserController] getUserFullCheck error:", error);
            res.status(500).json({ success: false, error: "Internal server error" });
        }
    }

    public async getUserDevice(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.params.userId || (req.query.userId as string);
            if (!userId || !SNOWFLAKE_REGEX.test(userId)) {
                res.status(400).json({ success: false, error: "Valid snowflake userId is required" });
                return;
            }

            const result = checkDeviceService.execute(userId);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            console.error("[UserController] getUserDevice error:", error);
            res.status(500).json({ success: false, error: "Internal server error" });
        }
    }

    public async getUserConnections(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.params.userId || (req.query.userId as string);
            if (!userId || !SNOWFLAKE_REGEX.test(userId)) {
                res.status(400).json({ success: false, error: "Valid snowflake userId is required" });
                return;
            }

            const result = checkConnectionsService.execute(userId, false);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            console.error("[UserController] getUserConnections error:", error);
            res.status(500).json({ success: false, error: "Internal server error" });
        }
    }
}

export const userController = new UserController();
