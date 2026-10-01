import {
    ContainerBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} from 'discord.js';
import { sep, text } from '../components';

const EMBEDV2_COLOR = 0xBBEDFF;

export function buildSupportPayload(botName: string, _botIcon?: string): object {
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('support_category_select')
        .setPlaceholder('Select a support category...')
        .addOptions([
            {
                label: 'Bug Report',
                description: 'Report a glitch or unexpected behavior',
                value: 'bug_report',
            },
            {
                label: 'Custom Bots / Premium',
                description: 'Ask about custom bots or premium activation',
                value: 'custom_bots',
            },
        ]);

    const joinButton = new ButtonBuilder()
        .setLabel('Join Support Server')
        .setStyle(ButtonStyle.Link)
        .setURL(process.env.SUPPORT_SERVER || process.env.SUPPORT_SERVER_URL || 'https://discord.gg/XEs8UAWhdY');

    const menuRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
    const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(joinButton);

    const panel = new ContainerBuilder()
        .setAccentColor(EMBEDV2_COLOR)
        .addTextDisplayComponents(
            text(`# __${botName} Support__\n-# - __Community Support & Custom Bot Telemetry__`)
        )
        .addSeparatorComponents(sep())
        .addTextDisplayComponents(text(
            `> - **__Our support team is here to help! Choose an option below:__**`
        ))
        .addSeparatorComponents(sep())
        .addTextDisplayComponents(text(
            `- __Bug Report__  ・  Report glitches or unexpected behavior\n\n` +
            `- __Custom Bots__  ・  Discuss custom bots or premium activation`
        ))
        .addSeparatorComponents(sep())
        .addActionRowComponents(menuRow)
        .addSeparatorComponents(sep())
        .addActionRowComponents(buttonRow);

    return { flags: MessageFlags.IsComponentsV2, components: [panel] };
}
