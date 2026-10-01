import { Router } from "express";
import { userController } from "../controllers/user.controller.js";
import { discordGuildService } from "../../discord/services/discordGuild.service.js";
import { authMiddleware } from "../middleware/auth.js";
import { apiRateLimiter } from "../middleware/rateLimit.js";

const router = Router();

router.use(apiRateLimiter);
router.use(authMiddleware);

router.get("/user-deep-analytics/:userId", (req, res) => userController.getUserAnalytics(req, res));
router.get("/user-deep-analytics", (req, res) => userController.getUserAnalytics(req, res));
router.get("/user-voice/:userId", (req, res) => userController.getUserVoice(req, res));
router.get("/user-voice", (req, res) => userController.getUserVoice(req, res));
router.get("/voice-leaderboard", (req, res) => userController.getVoiceLeaderboard(req, res));
router.get("/voice-leaderboard/:guildId", (req, res) => userController.getVoiceLeaderboard(req, res));
router.get("/danger-roles/:userId", (req, res) => userController.getDangerRoles(req, res));
router.get("/danger-roles", (req, res) => userController.getDangerRoles(req, res));
router.get("/social-ship", (req, res) => userController.getSocialShip(req, res));
router.get("/user-presence/:userId", (req, res) => userController.getUserPresence(req, res));
router.get("/user-presence", (req, res) => userController.getUserPresence(req, res));
router.get("/user-roles/:userId", (req, res) => userController.getUserRoles(req, res));
router.get("/user-roles", (req, res) => userController.getUserRoles(req, res));
router.get("/user-boost/:userId", (req, res) => {
    const { userId } = req.params;
    const data = discordGuildService.getUserBoosts(userId);
    res.status(200).json({ success: true, ...data });
});
router.get("/user-profile/:userId", (req, res) => userController.getUserProfile(req, res));
router.get("/user-profile", (req, res) => userController.getUserProfile(req, res));
router.get("/user-fullcheck/:userId", (req, res) => userController.getUserFullCheck(req, res));
router.get("/user-fullcheck", (req, res) => userController.getUserFullCheck(req, res));
router.get("/user-device/:userId", (req, res) => userController.getUserDevice(req, res));
router.get("/user-device", (req, res) => userController.getUserDevice(req, res));
router.get("/user-connections/:userId", (req, res) => userController.getUserConnections(req, res));
router.get("/user-connections", (req, res) => userController.getUserConnections(req, res));

export default router;
