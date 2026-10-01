import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    MessageFlags
} from 'discord.js';
import { sep, text, safeSection, EMBEDV2_COLOR } from '../components';

const EMOJI_BEAR = '<a:laughingbear:1551020464476913774>';

export function buildTopmaComponents(_page?: number, _totalPages?: number): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('topma_myserver')
            .setLabel('My Server')
            .setStyle(ButtonStyle.Secondary)
    );
}

export function buildTopmaContainer(
    allServers: any[],
    page: number,
    totalPages: number,
    _totalVoice: number,
    fileName: string
): object {
    const top1 = allServers[0] || {};
    const top1Name = top1.name || top1.tag || top1.guildName || 'Unknown Leader';
    const top1Score = top1.score || top1.voiceCount || 0;
    const top1Avatar = top1.avatar || top1.icon || 'https://cdn.discordapp.com/embed/avatars/0.png';

    const row = buildTopmaComponents(page, totalPages);

    const container = new ContainerBuilder()
        .setAccentColor(EMBEDV2_COLOR)
        .addTextDisplayComponents(
            text(
                `# ${EMOJI_BEAR} __Morocco Voice Leaderboard__\n` +
                `-# - __Real-Time Voice Activity Rankings Across Monitored Guilds__`
            )
        )
        .addSeparatorComponents(sep())
        .addSectionComponents(
            safeSection(
                `- __#1 Leader:__ \`${top1Name}\`\n` +
                `- __Total Tracked:__ \`${allServers.length}\` Servers\n` +
                `- __Page:__ \`${page}\` / \`${totalPages}\``,
                top1Avatar
            )
        )
        .addSeparatorComponents(sep())
        .addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder().setURL(`attachment://${fileName}`)
            )
        )
        .addSeparatorComponents(sep())
        .addActionRowComponents(row);

    return {
        flags: MessageFlags.IsComponentsV2,
        components: [container]
    };
}
