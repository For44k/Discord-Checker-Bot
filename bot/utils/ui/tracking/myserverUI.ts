import {
    ContainerBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    MessageFlags
} from 'discord.js';
import { sep, text, safeSection, EMBEDV2_COLOR } from '../components';

const EMOJI_BEAR = '<a:laughingbear:1551020464476913774>';
const EMOJI_UNRANKED = '<a:kawaiiangrykuromi:1535618976091086888>';

export function buildMyServerContainer(
    server: any,
    rank: number,
    totalServers: number,
    _totalVoice: number,
    fileName: string,
    avatarUrl?: string,
    accentColor?: number
): object {
    const serverName = server.name || server.tag || server.guildName || 'Unknown Server';
    const members = server.membersCount || server.memberCount || 0;

    const avatar = avatarUrl || server.avatar || server.icon || `https://cdn.discordapp.com/embed/avatars/0.png`;

    const container = new ContainerBuilder()
        .setAccentColor(accentColor ?? EMBEDV2_COLOR)
        .addTextDisplayComponents(
            text(
                `# ${EMOJI_BEAR} __${serverName} Leaderboard__\n` +
                `-# - __Voice Activity Leaderboard Stats__`
            )
        )
        .addSeparatorComponents(sep())
        .addSectionComponents(
            safeSection(
                `- __Target Server:__ \`${serverName}\`\n` +
                `- __Global Rank:__ \`#${rank}\` of \`${totalServers}\` Tracked Servers\n` +
                `- __Members:__ \`${members.toLocaleString()}\``,
                avatar
            )
        )
        .addSeparatorComponents(sep())
        .addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder().setURL(`attachment://${fileName}`)
            )
        )
        .addSeparatorComponents(sep());

    return {
        flags: MessageFlags.IsComponentsV2,
        components: [container]
    };
}

export function buildUnrankedServerContainer(
    _targetId: string,
    targetName: string
): object {
    const container = new ContainerBuilder()
        .setAccentColor(EMBEDV2_COLOR)
        .addTextDisplayComponents(
            text(
                `# ${EMOJI_UNRANKED} __Server Not Ranked Yet__\n` +
                `-# - __Voice Activity Leaderboard__`
            )
        )
        .addSeparatorComponents(sep())
        .addTextDisplayComponents(
            text(
                `- __Target Server:__ \`${targetName}\`\n` +
                `- __Rank Status:__ *Unranked (No Voice Activity Recorded)*\n` +
                `- __Information:__ *This server is not currently ranked on the voice leaderboard. Join voice channels to start accumulating tracked voice activity score!*`
            )
        )
        .addSeparatorComponents(sep());

    return {
        flags: MessageFlags.IsComponentsV2,
        components: [container]
    };
}
