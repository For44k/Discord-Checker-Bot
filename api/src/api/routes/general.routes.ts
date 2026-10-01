import { Router } from 'express';
import { generalController } from '../controllers/general.controller.js';
import { authMiddleware } from '../middleware/auth.js';
import { apiRateLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.use(apiRateLimiter);
router.use(authMiddleware);

router.get('/meta-quest', (req, res) => generalController.getMetaQuest(req, res));
router.get('/meta-quest/:userId', (req, res) => generalController.getMetaQuest(req, res));
router.post('/mass-dm', (req, res) => generalController.postMassDm(req, res));
router.post('/message-members-all/:serverId', (req, res) => generalController.postMessageServerMembers(req, res));
router.post('/message-members-all-serverid', (req, res) => generalController.postMessageServerMembers(req, res));

export default router;
