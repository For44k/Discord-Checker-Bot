import { StringSelectMenuInteraction } from "discord.js";
import { buildCheckRolesPayload } from "../../../utils/ui/checker/checkrolesUI";
import { fetchDangerRoles } from "../../../services/api/apiService";
import { DangerRolesResponse } from "../../../types/apiContracts";
import { checkrolesCache } from "../../../commands/checker/checkroles";

export default {
    id: "cr_select_2",
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

        let data: DangerRolesResponse | { servers: []; success: boolean; userId: string; dangerCount: number } =
            checkrolesCache.get(userId) || {
                success: true,
                userId,
                dangerCount: 0,
                servers: []
            };

        if (!data.servers || data.servers.length === 0) {
            try {
                data = await fetchDangerRoles(userId);
                checkrolesCache.set(userId, data);
            } catch (_) {
                data = { success: false, userId, dangerCount: 0, servers: [] };
            }
        }

        const user = interaction.client.users.cache.get(userId) ||
            await interaction.client.users.fetch(userId).catch(() => interaction.user);

        const payload = await buildCheckRolesPayload(user, data, idx, interaction, authorId);
        await interaction.update(payload as Parameters<typeof interaction.update>[0]).catch(() => {});
    }
};
