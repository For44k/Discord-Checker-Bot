import { ButtonInteraction } from 'discord.js';
import { buildCheckRolesPayload } from '../../../utils/ui/checker/checkrolesUI';
import { fetchDangerRoles } from '../../../services/api/apiService';
import { DangerRolesResponse } from '../../../types/apiContracts';

export default {
    id: 'cr_page',
    async execute(interaction: ButtonInteraction): Promise<void> {
        await interaction.deferUpdate().catch(() => {});
        const parts = interaction.customId.split(':');
        const targetUserId = parts[1] || interaction.user.id;
        const pageIdx = parseInt(parts[2], 10) || 0;

        const user = interaction.client.users.cache.get(targetUserId) ||
            await interaction.client.users.fetch(targetUserId).catch(() => interaction.user);

        let data: DangerRolesResponse | { servers: []; success: boolean; userId: string; dangerCount: number } = {
            success: true,
            userId: targetUserId,
            dangerCount: 0,
            servers: []
        };

        try {
            data = await fetchDangerRoles(targetUserId);
        } catch (_) {
            data = { success: false, userId: targetUserId, dangerCount: 0, servers: [] };
        }

        const payload = await buildCheckRolesPayload(user, data, pageIdx, interaction);
        await interaction.editReply(payload).catch(() => {});
    }
};
