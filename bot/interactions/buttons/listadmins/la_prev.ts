import { ButtonInteraction } from 'discord.js';
import { apiGet } from '../../../services/api/apiService';
import { buildListAdminsPage, ADMINS_PER_PAGE } from '../../../utils/ui/info/listadminsUI';

export default {
    id: 'la_prev',
    async execute(interaction: ButtonInteraction): Promise<void> {
        await interaction.deferUpdate().catch(() => {});
        const parts = interaction.customId.split(':');
        const serverId = parts[1];
        const page = parseInt(parts[2], 10) || 0;
        const newPage = Math.max(0, page - 1);

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
                    newPage,
                    totalPages
                );
                await interaction.editReply(payload).catch(() => {});
            }
        } catch { }
    }
};
