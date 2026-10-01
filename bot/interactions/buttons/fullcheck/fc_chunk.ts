import { ButtonInteraction } from 'discord.js';
import { buildFullcheckPage, formatApiServers, MutualServerData } from '../../../utils/ui/checker/fullcheckUI';
import { fetchUserRoles } from '../../../services/api/apiService';

export default {
    id: 'fc_chunk',
    async execute(interaction: ButtonInteraction) {
        await interaction.deferUpdate().catch(() => {});
        const parts = interaction.customId.split(':');
        const targetUserId = parts[1] || interaction.user.id;
        const pageIdx = parseInt(parts[2], 10) || 0;

        const user = interaction.client.users.cache.get(targetUserId) ||
            await interaction.client.users.fetch(targetUserId).catch(() => interaction.user);

        let servers: MutualServerData[] = [];
        try {
            const rolesData = await fetchUserRoles(targetUserId);
            const baseServers = rolesData?.data || [];
            servers = formatApiServers(baseServers, interaction.client, user);
        } catch {
            servers = [];
        }

        const avatarUrl = user.displayAvatarURL({ size: 512, extension: 'png' });
        const chunk = Math.floor(pageIdx / 25);
        const payload = buildFullcheckPage(user, servers, pageIdx, chunk, avatarUrl);
        await interaction.editReply(payload).catch(() => {});
    }
};
