import { StringSelectMenuInteraction } from "discord.js";
import { buildFullcheckPage, formatApiServers, MutualServerData } from "../../../utils/ui/checker/fullcheckUI";
import { fetchUserRoles } from "../../../services/api/apiService";
import { fullcheckCache } from "../../../commands/checker/fullcheck";

export default {
    id: "fc_select",
    async execute(interaction: StringSelectMenuInteraction): Promise<void> {
        const parts = interaction.customId.split(":");
        const authorId = parts[1];


        if (authorId && interaction.user.id !== authorId) {
            await interaction.deferUpdate().catch(() => {});
            return;
        }

        const val = interaction.values[0];
        let userId = interaction.user.id;
        let idx = 0;

        if (val.includes(":")) {
            const valParts = val.split(":");
            userId = valParts[0];
            idx = parseInt(valParts[1], 10) || 0;
        } else {
            idx = parseInt(val, 10) || 0;
        }

        const user = interaction.client.users.cache.get(userId) ||
            await interaction.client.users.fetch(userId).catch(() => interaction.user);

        let servers: MutualServerData[] = fullcheckCache.get(userId) || [];
        if (servers.length === 0) {
            try {
                const rolesData = await fetchUserRoles(userId);
                const baseServers = rolesData?.data || [];
                servers = formatApiServers(baseServers, interaction.client, user);
                fullcheckCache.set(userId, servers);
            } catch (_) {
                servers = [];
            }
        }

        const avatarUrl = user.displayAvatarURL({ size: 512, extension: "png" });
        const chunk = Math.floor(idx / 25);
        const payload = buildFullcheckPage(user, servers, idx, chunk, avatarUrl, authorId);
        await interaction.update(payload as Parameters<typeof interaction.update>[0]).catch(() => {});
    }
};
