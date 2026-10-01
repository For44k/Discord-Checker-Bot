import { Request, Response } from 'express';
import { roleAlertService } from '../../discord/services/roleAlert.service.js';

export class AlertController {
    async getConfig(req: Request, res: Response): Promise<void> {
        const { guildId } = req.params;
        if (!guildId) {
            res.status(400).json({ success: false, error: 'Guild ID is required' });
            return;
        }

        const channelId = roleAlertService.getConfig(guildId);
        res.json({
            success: true,
            guildId,
            channelId,
            configured: Boolean(channelId)
        });
    }

    async setConfig(req: Request, res: Response): Promise<void> {
        const { guildId, channelId } = req.body;
        if (!guildId || !channelId) {
            res.status(400).json({ success: false, error: 'guildId and channelId are required' });
            return;
        }

        await roleAlertService.setConfig(guildId, channelId);
        res.json({
            success: true,
            message: 'Alert configuration saved',
            guildId,
            channelId
        });
    }

    async removeConfig(req: Request, res: Response): Promise<void> {
        const { guildId } = req.params;
        if (!guildId) {
            res.status(400).json({ success: false, error: 'Guild ID is required' });
            return;
        }

        await roleAlertService.removeConfig(guildId);
        res.json({
            success: true,
            message: 'Alert configuration removed',
            guildId
        });
    }

    async getRecentAlerts(req: Request, res: Response): Promise<void> {
        const limit = Number(req.query.limit) || 20;
        const alerts = roleAlertService.getRecentAlerts(limit);
        res.json({
            success: true,
            count: alerts.length,
            alerts
        });
    }
}

export const alertController = new AlertController();
