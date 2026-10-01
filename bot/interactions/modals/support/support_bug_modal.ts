import { ModalSubmitInteraction, MessageFlags, ContainerBuilder } from 'discord.js';
import { sep, text, safeSection } from '../../../utils/ui/components';

const EMBEDV2_COLOR = 0xBBEDFF;
const OWNER_IDS = ['1459194956517216510', '1287172309785776278'];

export default {
    id: 'support_bug_modal',
    async execute(interaction: ModalSubmitInteraction) {
        await interaction.deferReply({ ephemeral: true }).catch(() => { });
        const user = interaction.user;

        const desc = interaction.fields.getTextInputValue('bug_desc') || 'No description provided';
        const steps = interaction.fields.getTextInputValue('bug_steps') || 'No steps provided';
        const expected = interaction.fields.getTextInputValue('bug_expected') || 'None';

        const confirmContainer = new ContainerBuilder()
            .setAccentColor(EMBEDV2_COLOR)
            .addTextDisplayComponents(
                text(`## __Bug Report Submitted__`)
            )
            .addSeparatorComponents(sep())
            .addTextDisplayComponents(text(
                `> - **__Thank you <@${user.id}>!__**\n` +
                `Your bug report has been successfully dispatched to our development team.\n\n` +
                `- __Category:__ \`Bug Report\`\n` +
                `- __Submitted At:__ <t:${Math.floor(Date.now() / 1000)}:R>\n` +
                `- __Status:__ \`Dispatched to Developers\``
            ))
            .addSeparatorComponents(sep())
            .addTextDisplayComponents(text(
                `-# *Our staff will reach out via DM if additional details are needed.*`
            ))
            .addSeparatorComponents(sep());


        await interaction.editReply({
            flags: MessageFlags.IsComponentsV2,
            components: [confirmContainer],
        }).catch(() => { });


        const gridContent = `> - **__Bug Report Details__**\n` +
            `- __Description:__ ${desc}\n\n` +
            `- __Steps to Reproduce:__ ${steps}\n\n` +
            `- __Expected Behavior:__ ${expected}`;

        const report = new ContainerBuilder()
            .setAccentColor(EMBEDV2_COLOR)
            .addTextDisplayComponents(
                text(`# __New Bug Report__`)
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
