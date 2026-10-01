import { ButtonInteraction } from 'discord.js';
import { CheckerClient } from '../../../core/client';
import { ConsentService } from '../../../database/services/consentStore';
import { buildConsentDeclinedContainer } from '../../../utils/ui/general/consentUI';

export default {
    id: 'consent_decline',
    async execute(interaction: ButtonInteraction, _client: CheckerClient) {
        const parts = interaction.customId.split(':');
        const targetUserId = parts[1];

        if (targetUserId && interaction.user.id !== targetUserId) {
            return interaction.reply({
                content: 'This registration prompt was opened for another user.',
                ephemeral: true,
            });
        }

        await ConsentService.revokeConsent(interaction.user.id);

        const updatedPayload = buildConsentDeclinedContainer(interaction.user.id);
        await interaction.update(updatedPayload).catch(() => {});
    },
};
