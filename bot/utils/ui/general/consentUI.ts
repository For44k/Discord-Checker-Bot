import {
    ContainerBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} from 'discord.js';
import { sep, text, v2, EMBEDV2_COLOR } from '../components';

const EMOJI_BEAR = '<a:laughingbear:1551020464476913774>';
const EMOJI_SUCCESS = '<:succes:1494764241142677686>';
const EMOJI_WARN = '<a:warning_animated:1352909221968220170>';

export function buildConsentPrompt(userId: string, _username?: string): any {
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(`consent_accept:${userId}`)
            .setLabel('Accept & Continue')
            .setStyle(ButtonStyle.Success)
            .setEmoji('1494764241142677686'),
        new ButtonBuilder()
            .setCustomId(`consent_decline:${userId}`)
            .setLabel('Decline')
            .setStyle(ButtonStyle.Secondary)
    );

    const container = new ContainerBuilder()
        .setAccentColor(EMBEDV2_COLOR)
        .addTextDisplayComponents(
            text(
                `# ${EMOJI_BEAR} __Data Access & Privacy Authorization__\n` +
                `-# - __Network Transparency & Privacy Agreement__`
            )
        )
        .addSeparatorComponents(sep())
        .addTextDisplayComponents(
            text(`> - **__Hello <@${userId}>, please authorize data usage to proceed:__**`)
        )
        .addSeparatorComponents(sep())
        .addTextDisplayComponents(
            text(
                `- __Role & Staff Indexing:__ \`Public\`  ・  Server roles & staff status are indexed for queries\n` +
                `- __Voice Activity Tracking:__ \`Enabled\`  ・  Voice channel analytics & leaderboard stats\n` +
                `- __Data Protection:__ \`Guaranteed\`  ・  Your information is never sold to third parties`
            )
        )
        .addSeparatorComponents(sep())
        .addTextDisplayComponents(
            text(`__Click **Accept & Continue** below to authorize and unlock all bot commands.__`)
        )
        .addSeparatorComponents(sep())
        .addActionRowComponents(row);

    return v2([container]);
}

export function buildConsentAcceptedContainer(userId: string): any {
    const container = new ContainerBuilder()
        .setAccentColor(EMBEDV2_COLOR)
        .addTextDisplayComponents(
            text(
                `# ${EMOJI_SUCCESS} __Authorization Granted__\n` +
                `-# - __Account Successfully Verified__`
            )
        )
        .addSeparatorComponents(sep())
        .addTextDisplayComponents(
            text(
                `> - **__Welcome <@${userId}>!__**\n` +
                `- __Status:__ \`Authorized & Active\`\n` +
                `- __Access:__ *All commands and bot features are now fully unlocked for your account.*`
            )
        )
        .addSeparatorComponents(sep());

    return v2([container]);
}

export function buildConsentDeclinedContainer(userId: string): any {
    const container = new ContainerBuilder()
        .setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
            text(
                `# ${EMOJI_WARN} __Authorization Declined__\n` +
                `-# - __Access Restricted__`
            )
        )
        .addSeparatorComponents(sep())
        .addTextDisplayComponents(
            text(
                `> - **__<@${userId}> declined data authorization.__**\n` +
                `- __Status:__ \`Restricted\`\n` +
                `- __Notice:__ *Bot interaction is disabled. Run any command to open this prompt again.*`
            )
        )
        .addSeparatorComponents(sep());

    return v2([container]);
}
