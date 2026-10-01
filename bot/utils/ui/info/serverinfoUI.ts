import {
    ContainerBuilder,
    SectionBuilder,
    TextDisplayBuilder,
    ThumbnailBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Message
} from 'discord.js';
import { sep, text, v2, headerSection, safeSection } from '../components';

const EMBEDV2_COLOR = 0xBBEDFF;
const EMOJI_HEADER = '<a:cutekuromis:1550907953027227738>';
const EMOJI_DETAILS = '<:custom_emoji:1550907736999460885>';
const EMOJI_STATS = '<a:05_penguin_football:1550911039657214002>';
const EMOJI_BANNER = '<a:sparkles:1537825952271302748>';

export function buildServerInfoError(): object {
    const c = new ContainerBuilder()
        .setAccentColor(EMBEDV2_COLOR)
        .addTextDisplayComponents(
            text(
                `# ${EMOJI_HEADER} __Server Analytics & Telemetry__\n` +
                `-# - __High Fidelity Server Intelligence__`
            )
        )
        .addSeparatorComponents(sep())
        .addTextDisplayComponents(
            text(
                `# <a:warning_animated:1352909221968220170> __Server Could Not Be Found__\n` +
                `- __Status:__ \`The requested server was not found in our database or active cache.\``
            )
        )
        .addSeparatorComponents(sep());
    return v2([c]);
}

function getSnowflakeDate(id?: string): Date | null {
    if (!id || !/^\d{17,20}$/.test(id)) return null;
    try {
        return new Date(Number((BigInt(id) >> 22n) + 1420070400000n));
    } catch {
        return null;
    }
}

export function buildServerInfoPage(s: any, _message?: Message): object {
    const serverDate = s.createdAt ? new Date(s.createdAt) : getSnowflakeDate(s.id);
    const serverCreation = serverDate && !isNaN(serverDate.getTime())
        ? `<t:${Math.floor(serverDate.getTime() / 1000)}:D> (<t:${Math.floor(serverDate.getTime() / 1000)}:R>)`
        : 'Unknown';
    const serverIcon = s.icon || 'https://cdn.discordapp.com/embed/avatars/0.png';
    const ownerAvatar = s.ownerAvatar || 'https://cdn.discordapp.com/embed/avatars/0.png';

    const ownerDate = s.ownerCreatedAt ? new Date(s.ownerCreatedAt) : getSnowflakeDate(s.ownerId);
    const ownerCreation = ownerDate && !isNaN(ownerDate.getTime())
        ? `<t:${Math.floor(ownerDate.getTime() / 1000)}:D> (<t:${Math.floor(ownerDate.getTime() / 1000)}:R>)`
        : 'Unknown';

    let ownerLastOnline = 'Offline / Invisible';
    if (s.ownerLastOnline) {
        const lastDate = new Date(s.ownerLastOnline);
        if (!isNaN(lastDate.getTime())) {
            ownerLastOnline = `<t:${Math.floor(lastDate.getTime() / 1000)}:R>`;
        }
    } else if (s.ownerOnlineStatus && s.ownerOnlineStatus !== 'offline') {
        const statusMap: Record<string, string> = {
            online: '🟢 Active Now (Online)',
            idle: '🌙 Active Now (Idle)',
            dnd: '⛔ Active Now (Do Not Disturb)'
        };
        ownerLastOnline = statusMap[s.ownerOnlineStatus] || `🟢 Active Now (\`${s.ownerOnlineStatus}\`)`;
    }

    const totalChannels = s.totalChannels ?? s.channels ?? s.channelCount ?? 0;
    const serverBoosts = s.boosts ?? s.boostCount ?? 0;
    const totalMembers = s.memberCount ?? s.membersCount ?? 0;
    const ownerMention = s.ownerId ? `<@${s.ownerId}>` : 'Unknown';

    const container = new ContainerBuilder()
        .setAccentColor(EMBEDV2_COLOR)
        .addTextDisplayComponents(
            text(
                `# ${EMOJI_HEADER} __Server Analytics & Telemetry__\n` +
                `> - **__High Fidelity Server Intelligence__**`
            )
        )
        .addSeparatorComponents(sep())
        .addSectionComponents(
            headerSection(
                `## ${s.name || 'Unknown Server'}\n` +
                `- __Server ID:__ \`${s.id || 'N/A'}\`\n` +
                `- __Server Owner:__ ${ownerMention}\n` +
                `- __Created At:__ ${serverCreation}` +
                (s.vanityURL ? `\n- __Vanity URL:__ \`discord.gg/${s.vanityURL}\`` : ''),
                serverIcon
            )
        )
        .addSeparatorComponents(sep());

    let statsLines =
        `- __Total Members:__ \`${Number(totalMembers).toLocaleString()}\`\n` +
        `- __Total Channels:__ \`${totalChannels}\`\n` +
        `- __Server Boosts:__ \`${serverBoosts}\` Boosts`;

    if (s.topMaRank && s.totalTrackedGuilds) {
        statsLines += `\n- __Top Maroc Rank:__ \`#${s.topMaRank} / ${s.totalTrackedGuilds}\``;
    }

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `## ${EMOJI_STATS} __Server Statistics__\n${statsLines}`
        )
    );

    container.addSeparatorComponents(sep());

    const ownerLines =
        `- __Owner Account:__ ${ownerMention} | \`${s.ownerId || 'N/A'}\`\n` +
        `- __Account Created:__ ${ownerCreation}\n` +
        `- __Last Time Online:__ ${ownerLastOnline}\n` +
        `- __Boosting Server:__ \`${s.ownerBoostingServer ? 'Active Booster' : 'Not Boosting'}\``;

    container.addSectionComponents(
        safeSection(`## ${EMOJI_DETAILS} __Ownership & Hierarchy__\n${ownerLines}`, ownerAvatar)
    );

    container.addSeparatorComponents(sep());

    const highestRoleName = s.highestRole?.name || 'None found';
    const highestRoleId = s.highestRole?.id ? ` | \`${s.highestRole.id}\`` : '';
    let roleSectionContent =
        `## ${EMOJI_DETAILS} __Highest Role & Hierarchy__\n` +
        `> - __\`${highestRoleName}\`__${highestRoleId}`;

    if (s.highestRoleHolders && s.highestRoleHolders.length > 0) {
        const displayHolders = s.highestRoleHolders.slice(0, 5);
        const remaining = s.highestRoleHolders.length - displayHolders.length;
        const holdersLines = displayHolders
            .map((h: any) => `> - <@${h.id}> | \`${h.id}\``)
            .join('\n') + (remaining > 0 ? `\n> - *... and ${remaining} more holder(s)*` : '');

        roleSectionContent += `\n- __Role Holders (${s.highestRoleHolders.length}):__\n${holdersLines}`;
    }

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(roleSectionContent)
    );

    const bannerUrl = s.banner || s.bannerURL;
    if (bannerUrl) {
        container.addSeparatorComponents(sep());
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## ${EMOJI_BANNER} __Server Banner__`)
        );
        container.addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder().setURL(bannerUrl)
            )
        );
    }

    container.addSeparatorComponents(sep());

    if (s.id) {
        const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(`si_admins:${s.id}`)
                .setLabel('Admins')
                .setStyle(ButtonStyle.Secondary)
        );
        container.addActionRowComponents(actionRow);
        container.addSeparatorComponents(sep());
    }

    return v2([container]);
}
