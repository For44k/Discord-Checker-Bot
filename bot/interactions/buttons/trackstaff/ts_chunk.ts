import { ButtonInteraction } from 'discord.js';
import { buildTrackStaffPage } from '../../../utils/ui/tracking/trackstaffUI';

export default {
    id: 'ts_next',
    async execute(interaction: ButtonInteraction) {
        await interaction.deferUpdate().catch(() => {});
        const payload = buildTrackStaffPage([], 0, 0, 1, 2, interaction.message as any);
        await interaction.editReply(payload);
    }
};
