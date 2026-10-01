import {
    StringSelectMenuInteraction,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder
} from 'discord.js';

export default {
    id: 'support_category_select',
    async execute(interaction: StringSelectMenuInteraction) {
        const choice = interaction.values[0];

        if (choice === 'bug_report') {
            const modal = new ModalBuilder()
                .setCustomId('support_bug_modal')
                .setTitle('Bug Report Submission');

            const descInput = new TextInputBuilder()
                .setCustomId('bug_desc')
                .setLabel('Bug Description')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Describe what went wrong or any unexpected error message')
                .setRequired(true);

            const stepsInput = new TextInputBuilder()
                .setCustomId('bug_steps')
                .setLabel('Steps to Reproduce')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('What command or actions triggered this bug?')
                .setRequired(true);

            const expectedInput = new TextInputBuilder()
                .setCustomId('bug_expected')
                .setLabel('Expected Behavior')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('What was supposed to happen?')
                .setRequired(false);

            modal.addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(descInput),
                new ActionRowBuilder<TextInputBuilder>().addComponents(stepsInput),
                new ActionRowBuilder<TextInputBuilder>().addComponents(expectedInput)
            );

            return interaction.showModal(modal);
        }

        if (choice === 'custom_bots') {
            const modal = new ModalBuilder()
                .setCustomId('support_custombots_modal')
                .setTitle('Custom Bot Inquiry');

            const lookingInput = new TextInputBuilder()
                .setCustomId('custom_looking')
                .setLabel('What features do you need?')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Please describe the bot functions you are looking for')
                .setRequired(true);

            const budgetInput = new TextInputBuilder()
                .setCustomId('custom_budget')
                .setLabel('Budget (if applicable)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Your budget or payment preference')
                .setRequired(false);

            modal.addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(lookingInput),
                new ActionRowBuilder<TextInputBuilder>().addComponents(budgetInput)
            );

            return interaction.showModal(modal);
        }
    }
};
