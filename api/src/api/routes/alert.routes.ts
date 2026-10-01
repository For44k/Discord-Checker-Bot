import { Router } from 'express';
import { alertController } from '../controllers/alert.controller.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/role-alerts/config/:guildId', alertController.getConfig.bind(alertController));
router.post('/role-alerts/config', alertController.setConfig.bind(alertController));
router.delete('/role-alerts/config/:guildId', alertController.removeConfig.bind(alertController));
router.get('/role-alerts/recent', alertController.getRecentAlerts.bind(alertController));

export default router;
