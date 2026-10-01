import { Request, Response } from 'express';
import { discordGeneralService } from '../../discord/services/discordGeneral.service.js';

export class GeneralController {
    getMetaQuest(req: Request, res: Response): void {
        try {
            const userId = req.params.userId as string | undefined;
            const data = discordGeneralService.getMetaQuest(userId);
            res.status(200).json({ success: true, data });
        } catch (error: unknown) {
            console.error('[GeneralController] getMetaQuest error:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }

    async postMassDm(req: Request, res: Response): Promise<void> {
        try {
            const { userIds, message } = req.body;

            if (!Array.isArray(userIds) || userIds.length === 0 || !message || typeof message !== 'string') {
                res.status(400).json({ success: false, error: 'userIds (array of snowflakes) and message (string) are required' });
                return;
            }

            const cleanUserIds = userIds.filter(id => typeof id === 'string' && /^\d{17,20}$/.test(id));
            if (cleanUserIds.length === 0) {
                res.status(400).json({ success: false, error: 'No valid snowflake user IDs provided' });
                return;
            }

            const data = await discordGeneralService.massDm(cleanUserIds, message);
            res.status(200).json({ success: true, data });
        } catch (error: unknown) {
            console.error('[GeneralController] postMassDm error:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }

    async postMessageServerMembers(req: Request, res: Response): Promise<void> {
        try {
            const serverId = (req.params.serverId || req.body?.serverId) as string;
            const message = req.body?.message as string;

            if (!serverId || !/^\d{17,20}$/.test(serverId) || !message || typeof message !== 'string') {
                res.status(400).json({ success: false, error: 'Valid serverId snowflake and message string are required' });
                return;
            }

            const data = await discordGeneralService.messageAllServerMembers(serverId, message);
            res.status(200).json({ success: true, data });
        } catch (error: unknown) {
            console.error('[GeneralController] postMessageServerMembers error:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }
}

export const generalController = new GeneralController();
