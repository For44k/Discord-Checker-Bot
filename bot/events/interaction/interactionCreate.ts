import {
    Interaction,
    Events,
    ButtonInteraction,
    StringSelectMenuInteraction,
    ModalSubmitInteraction
} from "discord.js";
import { CheckerClient } from "../../core/client";
import { logger } from "../../utils/logger/logger";
import { handleSlashCommand } from "../../core/slashCommands";

export default {
    name: Events.InteractionCreate,
    async execute(interaction: Interaction, client: CheckerClient) {
        try {
            if (interaction.isChatInputCommand()) {
                await handleSlashCommand(interaction, client);
            } else if (interaction.isButton()) {
                const btn = interaction as ButtonInteraction;
                const baseId = btn.customId.split(":")[0];
                const handler = client.buttons.get(btn.customId) || client.buttons.get(baseId);
                if (handler) {
                    await handler.execute(btn, client);
                }
            } else if (interaction.isStringSelectMenu()) {
                const select = interaction as StringSelectMenuInteraction;
                const baseId = select.customId.split(":")[0];
                const handler = client.selectMenus.get(select.customId) || client.selectMenus.get(baseId);
                if (handler) {
                    await handler.execute(select, client);
                }
            } else if (interaction.isModalSubmit()) {
                const modal = interaction as ModalSubmitInteraction;
                const baseId = modal.customId.split(":")[0];
                const handler = client.modals.get(modal.customId) || client.modals.get(baseId);
                if (handler) {
                    await handler.execute(modal, client);
                }
            }
        } catch (err: unknown) {
            logger.error(`Error in interaction ${interaction.id}:`, err);
        }
    }
};
