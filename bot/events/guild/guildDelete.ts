import { Events, Guild } from 'discord.js';
import { CheckerClient } from '../../core/client';
import { WebhookLogger } from '../../services/logging/webhookLogger';
import { logger } from '../../utils/logger/logger';

export default {
    name: Events.GuildDelete,
    async execute(guild: Guild, client: CheckerClient) {
        logger.info(`[GuildDelete] Bot removed from server: ${guild.name} (${guild.id})`);
        WebhookLogger.logGuildLeave(guild, client).catch(err => logger.error('[GuildDelete] Webhook log error:', err));
    }
};
