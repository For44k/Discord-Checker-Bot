import { ContainerBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Message } from 'discord.js';
import { EMBEDV2_COLOR, sep, text, v2 } from '../components';

const SUPPORT_URL = process.env.SUPPORT_SERVER || process.env.SUPPORT_SERVER_URL || 'https://discord.gg/XEs8UAWhdY';

export function buildCurrentPrefixPayload(current: string, _message?: Message): object {
    const joinButton = new ButtonBuilder()
        .setLabel('Join Support Server')
        .setStyle(ButtonStyle.Link)
        .setURL(SUPPORT_URL);

    const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(joinButton);

    const c = new ContainerBuilder()
        .setAccentColor(EMBEDV2_COLOR)
        .addTextDisplayComponents(text(`# __Server Prefix__`))
        .addSeparatorComponents(sep())
        .addTextDisplayComponents(text(
            `- __Current Prefix:__ \`${current}\`\n` +
            `- __New Prefix:__ \`${current}prefix -\``
        ))
        .addSeparatorComponents(sep())
        .addTextDisplayComponents(text(
            `> - **__For Support Or Additional Information__**`
        ))
        .addSeparatorComponents(sep())
        .addActionRowComponents(buttonRow)
        .addSeparatorComponents(sep());

    return v2([c]);
}

export function buildPrefixUpdatedPayload(newPrefix: string, _message?: Message): object {
    const joinButton = new ButtonBuilder()
        .setLabel('Join Support Server')
        .setStyle(ButtonStyle.Link)
        .setURL(SUPPORT_URL);

    const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(joinButton);

    const c = new ContainerBuilder()
        .setAccentColor(EMBEDV2_COLOR)
        .addTextDisplayComponents(text(`# <a:white_stars:1547180877962944585> __Server Prefix Updated__`))
        .addSeparatorComponents(sep())
        .addTextDisplayComponents(text(
            `- __Current Prefix:__ \`${newPrefix}\`\n` +
            `- __New Prefix:__ \`${newPrefix}prefix -\``
        ))
        .addSeparatorComponents(sep())
        .addTextDisplayComponents(text(
            `> - **__For Support Or Additional Information__**`
        ))
        .addSeparatorComponents(sep())
        .addActionRowComponents(buttonRow)
        .addSeparatorComponents(sep());

    return v2([c]);
}
