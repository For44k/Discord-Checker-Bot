import { ModalSubmitInteraction, MessageFlags, ContainerBuilder } from 'discord.js';
import { sep, text, safeSection } from '../../../utils/ui/components';

const EMBEDV2_COLOR = 0xBBEDFF;
const OWNER_IDS = ['1459194956517216510', '1287172309785776278'];

export default {
    id: 'support_custombots_modal',
    async execute(interaction: ModalSubmitInteraction) {
        await interaction.deferReply({ ephemeral: true }).catch(() => { });
        const user = interaction.user;

        const looking = interaction.fields.getTextInputValue('custom_looking') || 'No details provided';
        const budget = interaction.fields.getTextInputValue('custom_budget') || 'None';

        const confirmContainer = new ContainerBuilder()
            .setAccentColor(EMBEDV2_COLOR)
            .addTextDisplayComponents(
                text(`## __Custom Bot Inquiry Sent__`)
            )
            .addSeparatorComponents(sep())
            .addTextDisplayComponents(text(
                `> - **__Thank you <@${user.id}>!__**\n` +
                `Your custom bot inquiry has been successfully dispatched to our development team.\n\n` +
                `- __Category:__ \`Custom Bot Inquiry\`\n` +
                `- __Submitted At:__ <t:${Math.floor(Date.now() / 1000)}:R>\n` +
                `- __Status:__ \`Dispatched to Developers\``
            ))
            .addSeparatorComponents(sep())
            .addTextDisplayComponents(text(
                `-# - __Our staff will reach out to you via DM soon.__`
            ))
            .addSeparatorComponents(sep());


        await interaction.editReply({
            flags: MessageFlags.IsComponentsV2,
            components: [confirmContainer],
        }).catch(() => { });


        const gridContent = `> - **__Custom Bot Inquiry Details__**\n` +
            `- **Looking For:** ${looking}\n\n` +
            `- **Budget / Preference:** ${budget}`;

        const report = new ContainerBuilder()
            .setAccentColor(EMBEDV2_COLOR)
            .addTextDisplayComponents(
                text(`# __New Custom Bot Inquiry__`)
            )
            .addSeparatorComponents(sep())
            .addTextDisplayComponents(text(
                `> - **__Submitter Info__**\n` +
                `- __Mention:__ <@${user.id}>\n` +
                `- __Username:__ \`${user.tag}\` (\`${user.id}\`)`
            ))
            .addSeparatorComponents(sep())
            .addTextDisplayComponents(text(
                `> - **__Location & Time__**\n` +
                `- __Server:__ \`${interaction.guild?.name || 'DM'}\` (\`${interaction.guild?.id || 'N/A'}\`)\n` +
                `- __Submitted:__ <t:${Math.floor(Date.now() / 1000)}:R>`
            ))
            .addSeparatorComponents(sep())
            .addTextDisplayComponents(text(gridContent));

        Promise.allSettled(
            OWNER_IDS.map(async (ownerId) => {
                const owner = await interaction.client.users.fetch(ownerId).catch(() => null);
                if (owner) {
                    await owner.send({ flags: MessageFlags.IsComponentsV2, components: [report] }).catch(() => { });
                }
            })
        ).catch(() => { });
    }
};
