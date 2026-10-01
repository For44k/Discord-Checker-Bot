import { Router } from "express";
import { guildController } from "../controllers/guild.controller.js";
import { discordClientManager } from "../../discord/client/clientManager.js";
import { ServerActionLogModel, IServerActionLog } from "../../database/models/ServerActionLog.model.js";
import { authMiddleware } from "../middleware/auth.js";
import { apiRateLimiter } from "../middleware/rateLimit.js";

const router = Router();

router.use(apiRateLimiter);
router.use(authMiddleware);

router.get("/server-info/:serverId", (req, res) => guildController.getServerInfo(req, res));
router.get("/server-members/:serverId", (req, res) => guildController.getServerMembers(req, res));
router.get("/server-admins/:serverId", (req, res) => guildController.getServerAdmins(req, res));
router.get("/server-bots/:serverId", (req, res) => guildController.getServerBots(req, res));
router.get("/server-roles-icons/:serverId", (req, res) => guildController.getServerRolesWithIcons(req, res));
router.get("/server-emojis/:serverId", (req, res) => guildController.getServerEmojis(req, res));
router.get("/server-stickers/:serverId", (req, res) => guildController.getServerStickers(req, res));
router.get("/guild-voice/:guildId", (req, res) => guildController.getGuildActiveVoice(req, res));

router.get("/server-logs/:serverId", async (req, res) => {
    try {
        const { serverId } = req.params;
        const client = discordClientManager.getClient();
        const guild = client.guilds.cache.get(serverId);

        let logs: unknown[] = [];
        try {
            logs = await ServerActionLogModel.find({ serverId }).sort({ timestamp: -1 }).limit(200).lean();
        } catch (_) {}

        res.status(200).json({
            success: true,
            found: Boolean(guild || logs.length > 0),
            guild: guild
                ? {
                      id: guild.id,
                      name: guild.name,
                      icon: guild.iconURL({ dynamic: true, size: 256 })
                  }
                : null,
            logs,
            logCount: logs.length
        });
    } catch (error) {
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});

router.get("/all-server-logs", async (req, res) => {
    try {
        const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 200, 1), 1000);
        let logs: unknown[] = [];
        try {
            logs = await ServerActionLogModel.find({}).sort({ timestamp: -1 }).limit(limit).lean();
        } catch (_) {}

        res.status(200).json({
            success: true,
            totalLogs: logs.length,
            returnedLogs: logs.length,
            logs
        });
    } catch (error) {
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});

export default router;
