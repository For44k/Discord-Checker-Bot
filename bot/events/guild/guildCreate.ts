import { Events, Guild } from 'discord.js';
import { CheckerClient } from '../../core/client';
import { WebhookLogger } from '../../services/logging/webhookLogger';
import { logger } from '../../utils/logger/logger';

export default {
    name: Events.GuildCreate,
    async execute(guild: Guild, client: CheckerClient) {
        logger.info(`[GuildCreate] Bot added to new server: ${guild.name} (${guild.id}) with ${guild.memberCount} members`);
        WebhookLogger.logGuildJoin(guild, client).catch(err => logger.error('[GuildCreate] Webhook log error:', err));
    }
};
