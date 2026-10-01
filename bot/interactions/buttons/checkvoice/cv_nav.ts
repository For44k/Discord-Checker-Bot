import { ButtonInteraction } from 'discord.js';
import { fetchUserVoice } from '../../../services/api/apiService';
import { buildCheckVoicePayload } from '../../../utils/ui/checker/checkvoiceUI';
import { UserVoiceResponse } from '../../../types/apiContracts';

export default {
    id: 'cv_prev',
    async execute(interaction: ButtonInteraction): Promise<void> {
        await interaction.deferUpdate().catch(() => {});
        const customId = interaction.customId;
        const parts = customId.split(':');
        const userId = parts[1] || interaction.user.id;
        const page = parseInt(parts[2], 10) || 0;

        const user = await interaction.client.users.fetch(userId).catch(() => interaction.user);
        let data: UserVoiceResponse = {
            success: true,
            userId,
            inVoice: false,
            matches: []
        };
        try {
            data = await fetchUserVoice(userId);
        } catch { }

        const payload = buildCheckVoicePayload(user, data, page);
        await interaction.editReply(payload).catch(() => {});
    }
};
