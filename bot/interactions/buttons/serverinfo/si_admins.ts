import { ButtonInteraction } from 'discord.js';
import { apiGet } from '../../../services/api/apiService';
import { buildListAdminsPage, ADMINS_PER_PAGE } from '../../../utils/ui/info/listadminsUI';

export default {
    id: 'si_admins',
    async execute(interaction: ButtonInteraction): Promise<void> {
        await interaction.deferUpdate().catch(() => {});
        const serverId = interaction.customId.split(':')[1];
        if (!serverId) return;

        try {
            const data: any = await apiGet(`/api/server-admins/${serverId}`);
            if (data?.success && Array.isArray(data.admins)) {
                const admins = data.admins.filter((a: any) => !a.bot && !a.user?.bot);
                const totalPages = Math.ceil(admins.length / ADMINS_PER_PAGE) || 1;
                const payload = buildListAdminsPage(
                    admins,
                    data.guildName || 'Unknown Server',
                    serverId,
                    data.guildIcon || null,
                    0,
                    totalPages
                );
                await interaction.followUp({ ...(payload as any), ephemeral: true }).catch(() => {});
            }
        } catch {}
    }
};
