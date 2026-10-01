import { Router } from 'express';
import { voiceController } from '../controllers/voice.controller.js';
import { authMiddleware } from '../middleware/auth.js';
import { apiRateLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.use(apiRateLimiter);
router.use(authMiddleware);

router.get('/top-voice', (req, res) => voiceController.getTopVoice(req, res));
router.get('/role-voice', (req, res) => voiceController.getRoleVoice(req, res));
router.post('/role-voice', (req, res) => voiceController.getRoleVoice(req, res));

export default router;
