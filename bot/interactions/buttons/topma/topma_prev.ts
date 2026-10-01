import { ButtonInteraction } from 'discord.js';
import { topmaSessionCache, renderTopmaPage } from '../../../commands/tracking/topma';

export default {
    id: 'topma_prev',
    async execute(interaction: ButtonInteraction) {
        await interaction.deferUpdate().catch(() => {});
        const session = topmaSessionCache.get(interaction.message.id) || topmaSessionCache.get(interaction.user.id);
        if (!session || session.currentPage <= 1) return;

        session.currentPage--;
        topmaSessionCache.set(interaction.message.id, session);
        topmaSessionCache.set(interaction.user.id, session);

        const result = await renderTopmaPage(
            session.allServers,
            session.currentPage,
            session.totalPages,
            session.totalVoice,
            interaction.client,
            session.bgIndex
        );
        await interaction.editReply(result).catch(() => {});
    }
};
