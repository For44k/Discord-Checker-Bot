import {
    ContainerBuilder,
    SectionBuilder,
    TextDisplayBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    User
} from 'discord.js';
import { sep, text, v2, headerSection, safeSection } from '../components';
import { UserVoiceResponse, UserVoiceMatch } from '../../../types/apiContracts';

const EMBEDV2_COLOR = 0xBBEDFF;
const MEMBERS_PER_PAGE = 5;

const EMOJI_HEADER = '<a:cutekuromis:1550907953027227738>';
const EMOJI_VOICE = '<:custom_emoji:1550907736999460885>';
const EMOJI_USERS = '<a:sparkles:1537825952271302748>';
const EMOJI_OFFLINE = '<a:ice:1543392867219677274>';
const EMOJI_LEFT = '<a:prev:1535661591276814436>';
const EMOJI_RIGHT = '<a:next:1537412085464571957>';
const EMOJI_JOIN = '<:click:1550850301010116648>';

export function buildCheckVoicePayload(user: User, data: UserVoiceResponse | Record<string, unknown>, page: number = 0): object {
    const avatar = user.displayAvatarURL({ size: 512, extension: 'png' });
    const rawData = data as Record<string, unknown>;
    const matches = (Array.isArray(rawData?.matches) ? rawData.matches : []) as Array<UserVoiceMatch | Record<string, unknown>>;
    const inVoice = Boolean(rawData?.inVoice && matches.length > 0);

    if (!inVoice) {
        const c = new ContainerBuilder()
            .setAccentColor(EMBEDV2_COLOR)
            .addTextDisplayComponents(
                text(
                    `# ${EMOJI_HEADER} __Reviewing User Status__\n` +
                    `-# - __Did't Found User In Servers__`
                )
            )
            .addSeparatorComponents(sep())
            .addSectionComponents(
                safeSection(
                    `## __User is Offline__\n` +
                    `- __Target User:__ <@${user.id}>\n` +
                    `- __User ID:__ \`${user.id}\`\n` +
                    `- __Voice Status:__ \`Not currently connected to any voice channel\``,
                    avatar
                )
            )
            .addSeparatorComponents(sep());

        return v2([c]);
    }

    const m = matches[0];
    const mObj = m as Record<string, unknown>;
    const guildName = String(mObj.guildName || 'Unknown Server');
    const guildId = String(mObj.guildId || mObj.guild_id || '');
    const channelName = String(mObj.channelName || 'Unknown Channel');
    const channelId = String(mObj.channelId || mObj.channel_id || 'N/A');

    const rawMembers = Array.isArray(mObj.membersList) ? (mObj.membersList as Array<Record<string, unknown>>) : null;
    const allMembers: Array<{ id: string; tag?: string; username?: string }> = rawMembers
        ? rawMembers.map((rm) => ({
              id: String(rm.id || ''),
              tag: typeof rm.tag === 'string' ? rm.tag : undefined,
              username: typeof rm.username === 'string' ? rm.username : undefined
          }))
        : [{ id: user.id, tag: user.tag, username: user.username }];
    const totalMembers = allMembers.length;
    const totalPages = Math.ceil(totalMembers / MEMBERS_PER_PAGE) || 1;
    const safePage = Math.max(0, Math.min(page, totalPages - 1));

    const start = safePage * MEMBERS_PER_PAGE;
    const currentMembers = allMembers.slice(start, start + MEMBERS_PER_PAGE);

    const actions: string[] = [];
    if (mObj.streaming) actions.push('Streaming');
    if (mObj.video) actions.push('Camera On');
    if (mObj.selfMute) actions.push('Muted');
    if (mObj.selfDeaf) actions.push('Deafened');
    const userAction = actions.length ? actions.join(', ') : 'Active';

    const actObj = typeof mObj.activity === 'object' && mObj.activity !== null ? (mObj.activity as Record<string, string>) : null;
    const activityName = String(actObj?.name || mObj.activityName || 'None');

    const membersInChannelText = currentMembers
        .map((mem) => `- <@${mem.id}> | \`${mem.id}\``)
        .join('\n');

    const container = new ContainerBuilder()
        .setAccentColor(EMBEDV2_COLOR)
        .addTextDisplayComponents(
            text(
                `# ${EMOJI_HEADER} __Active Voice Channel Status__\n` +
                `-# - __Live Server Telemetry & Activity__`
            )
        )
        .addSeparatorComponents(sep())
        .addSectionComponents(
            safeSection(
                `## ${EMOJI_VOICE} __Voice Channel Details__\n` +
                `- __Server:__ \`${guildName}\`${guildId ? ` | \`${guildId}\`` : ''}\n` +
                `- __Channel:__ \`🔊 ${channelName}\` | \`${channelId}\`\n` +
                `- __Target User:__ <@${user.id}>\n` +
                `- __Voice Status:__ \`${userAction}\`\n` +
                `- __Activity:__ \`${activityName}\``,
                avatar
            )
        )
        .addSeparatorComponents(sep())
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `## ${EMOJI_USERS} __Users in Voice Channel__\n${membersInChannelText}`
            )
        );

    const buttonsRow = new ActionRowBuilder<ButtonBuilder>();

    if (channelId && channelId !== 'N/A' && guildId) {
        buttonsRow.addComponents(
            new ButtonBuilder()
                .setLabel('Join Voice Channel')
                .setURL(`https://discord.com/channels/${guildId}/${channelId}`)
                .setStyle(ButtonStyle.Link)
                .setEmoji(EMOJI_JOIN)
        );
    }

    if (totalPages > 1) {
        buttonsRow.addComponents(
            new ButtonBuilder()
                .setCustomId(`cv_prev:${user.id}:${Math.max(0, safePage - 1)}`)
                .setLabel('Previous')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji(EMOJI_LEFT)
                .setDisabled(safePage === 0),
            new ButtonBuilder()
                .setCustomId(`cv_next:${user.id}:${Math.min(totalPages - 1, safePage + 1)}`)
                .setLabel('Next')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji(EMOJI_RIGHT)
                .setDisabled(safePage >= totalPages - 1)
        );
    }

    if (buttonsRow.components.length > 0) {
        container.addSeparatorComponents(sep());
        container.addActionRowComponents(buttonsRow);
    }
    container.addSeparatorComponents(sep());

    return v2([container]);
}
