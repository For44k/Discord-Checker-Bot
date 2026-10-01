import { CheckerClient } from '../../core/client';
import { logger } from '../../utils/logger/logger';
import { VoiceLockStore } from '../../database/services/voiceLockStore';
import { connectToVoice } from '../../commands/voicelock/join';
import { PermissionService } from '../../database/services/permissionStore';
import { PrefixService } from '../../database/services/prefixStore';
import { AlertChannelService } from '../../database/services/alertStore';
import { StaffService } from '../../database/services/staffStore';

import { registerSlashCommands } from '../../core/slashCommands';
import { WebhookLogger } from '../../services/logging/webhookLogger';
import { syncApplicationEmojis } from '../../services/emojiSync';

export default {
    name: 'ready',
    once: true,
    async execute(client: CheckerClient) {
        await Promise.all([
            PermissionService.init(),
            PrefixService.init(),
            AlertChannelService.init(),
            StaffService.ensureLoaded(),
        ]);

        logger.info(`Logged in as ${client.user?.tag} (${client.user?.id})`);
        logger.info(`Loaded ${client.commands.size} commands and ${client.buttons.size + client.selectMenus.size} interactions.`);

        WebhookLogger.logStartup(client.user).catch(() => {});
        syncApplicationEmojis(client).catch(() => {});

        registerSlashCommands(client).catch((err) => {
            logger.error('Error during registerSlashCommands:', err);
        });

        try {
            const allLocks = VoiceLockStore.getAll();
            for (const [guildId, channelId] of Object.entries(allLocks)) {
                const guild = client.guilds.cache.get(guildId);
                if (guild && channelId) {
                    connectToVoice(guild, channelId);
                    logger.info(`[VoiceLock] Rejoined 24/7 voice channel ${channelId} in guild ${guild.name} (${guildId})`);
                }
            }
        } catch (err) {
            logger.error('[VoiceLock] Failed to rejoin locked voice channels:', err);
        }
    }
};
