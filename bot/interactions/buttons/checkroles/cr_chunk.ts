import { ButtonInteraction } from 'discord.js';
import { buildCheckRolesPayload } from '../../../utils/ui/checker/checkrolesUI';
import { fetchDangerRoles } from '../../../services/api/apiService';

export default {
    id: 'cr_next',
    async execute(interaction: ButtonInteraction) {
        await interaction.deferUpdate().catch(() => {});
        const parts = interaction.customId.split(':');
        const targetUserId = parts[1] || interaction.user.id;
        const page = parseInt(parts[2], 10) || 0;

        const user = interaction.client.users.cache.get(targetUserId) ||
            await interaction.client.users.fetch(targetUserId).catch(() => interaction.user);

        let data: any = { success: true, userId: targetUserId, dangerCount: 0, servers: [] };
        try {
            data = await fetchDangerRoles(targetUserId);
        } catch {}

        const payload = await buildCheckRolesPayload(user, data, page, interaction);
        await interaction.editReply(payload).catch(() => {});
    }
};
