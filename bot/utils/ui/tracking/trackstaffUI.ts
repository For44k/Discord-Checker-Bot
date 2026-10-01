import {
    ContainerBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    TextDisplayBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Message
} from 'discord.js';
import { sep, text, v2, headerSection, safeSection, EMBEDV2_COLOR } from '../components';

const EMOJI_HEADER = '<a:cutekuromis:1550907953027227738>';
const EMOJI_ONLINE = '<a:online:1496276488033406996>';
const EMOJI_OFFLINE = '<a:busy:1495061122993361057>';
const EMOJI_LEFT = '<a:prev:1535661591276814436>';
const EMOJI_RIGHT = '<a:next:1537412085464571957>';

export const STAFF_PER_PAGE = 3;

function flagsFor(m: any): string {
    const f: string[] = [];
    if (m.muted) f.push('🔇 Muted');
    if (m.deafened) f.push('🎧 Deafened');
    if (m.streaming) f.push('📺 Streaming');
    if (m.video) f.push('📹 Camera On');
    return f.length ? `\n> - __Voice State:__ \`${f.join(' • ')}\`` : '';
}

function entryBlock(entry: any): string {
    const isVoice = entry.kind === 'voice';
    const p = entry.payload;
    const member = p.member;
    const uId = member?.id || 'unknown';
    const uTag = member?.tag || member?.username || uId;
    const roleMentions = (p.matchedRoleIds || []).map((id: string) => `<@&${id}>`).join(' • ') || '*none*';

    if (isVoice) {
        const gName = p.voiceGuild?.name || 'Unknown Server';
        const cName = p.channel?.name || 'Unknown Channel';
        const cId = p.channel?.id || null;
        const chMention = cId ? `<#${cId}>` : `\`🔊 ${cName}\``;

        return (
            `### ${EMOJI_ONLINE} ${uTag}\n` +
            `- __Staff Member:__ <@${uId}> | \`${uId}\`\n` +
            `- __Active Voice:__ ${chMention} in \`${gName}\`\n` +
            `- __Staff Roles:__ ${roleMentions}${flagsFor(p)}`
        );
    }

    const matchedServers = p.matchedIn || [];
    const shown = matchedServers.slice(0, 3);
    const more = matchedServers.length > shown.length ? ` *(+${matchedServers.length - shown.length} more)*` : '';
    const serverList = shown.length ? shown.map((g: any) => `\`${g.guildName}\``).join(' • ') : '*Unknown*';

    return (
        `### ${EMOJI_OFFLINE} ${uTag}\n` +
        `- __Staff Member:__ <@${uId}> | \`${uId}\`\n` +
        `- __Voice Status:__ \`Not in voice\`\n` +
        `- __Staff In:__ ${serverList}${more}\n` +
        `- __Staff Roles:__ ${roleMentions}`
    );
}

export function buildTrackStaffNoRoles(): object {
    const c = new ContainerBuilder()
        .setAccentColor(EMBEDV2_COLOR)
        .addTextDisplayComponents(
            text(
                `# ${EMOJI_HEADER} __Staff Activity Tracker__\n` +
                `-# - __Real-Time Staff Presence & Voice Telemetry__`
            )
        )
        .addSeparatorComponents(sep())
        .addTextDisplayComponents(
            text(
                `# <a:sadkuromi:1535618896390918214> __No Staff Roles Configured__\n` +
                `- __Status:__ \`No staff tracking roles set for this server.\`\n` +
                `- __Action:__ *Use \`+staffadd @Role\` to add staff tracking roles.*`
            )
        )
        .addSeparatorComponents(sep());
    return v2([c]);
}

export function buildTrackStaffNoStaffFound(message: Message): object {
    const c = new ContainerBuilder()
        .setAccentColor(EMBEDV2_COLOR)
        .addTextDisplayComponents(
            text(
                `# ${EMOJI_HEADER} __Staff Activity Tracker__\n` +
                `-# - __Real-Time Staff Presence & Voice Telemetry__`
            )
        )
        .addSeparatorComponents(sep())
        .addSectionComponents(
            headerSection(
                `# <a:kuromisleeping:1535619223269802018> __No Staff Members Found__\n` +
                `- __Server:__ \`${message.guild?.name || 'This Server'}\`\n` +
                `- __Status:__ \`No members found holding the configured staff roles.\``,
                message.guild?.iconURL({ size: 512, extension: 'png' }) || undefined
            )
        )
        .addSeparatorComponents(sep());
    return v2([c]);
}

export function buildTrackStaffPage(
    entries: any[],
    inVoiceCount: number,
    notInVoiceCount: number,
    page: number,
    totalPages: number,
    message: Message
): object {
    const computedTotal = totalPages || Math.ceil(entries.length / STAFF_PER_PAGE) || 1;
    const safePage = Math.max(0, Math.min(page, computedTotal - 1));
    const start = safePage * STAFF_PER_PAGE;
    const slice = entries.slice(start, start + STAFF_PER_PAGE);

    const container = new ContainerBuilder()
        .setAccentColor(EMBEDV2_COLOR)
        .addTextDisplayComponents(
            text(
                `# ${EMOJI_HEADER} __Staff Activity Tracker__\n` +
                `-# - __Real-Time Staff Presence & Voice Telemetry__`
            )
        )
        .addSeparatorComponents(sep())
        .addSectionComponents(
            headerSection(
                `## ${message.guild?.name || 'Server Staff Telemetry'}\n` +
                `- __In Voice:__ \`${inVoiceCount}\` Active 🎙️\n` +
                `- __Out of Voice:__ \`${notInVoiceCount}\` Offline 💤\n` +
                `- __Total Tracked:__ \`${entries.length}\` Members 👥`,
                message.guild?.iconURL({ size: 512, extension: 'png' }) || undefined
            )
        )
        .addSeparatorComponents(sep());

    slice.forEach((entry: any, idx: number) => {
        const memberAvatar = entry.payload.member?.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png';
        container.addSectionComponents(safeSection(entryBlock(entry), memberAvatar));

        if (idx < slice.length - 1) {
            container.addSeparatorComponents(sep());
        }
    });

    if (computedTotal > 1) {
        container.addSeparatorComponents(sep());
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId('ts_prev')
                .setLabel('Previous')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji(EMOJI_LEFT)
                .setDisabled(safePage === 0),
            new ButtonBuilder()
                .setCustomId('ts_label')
                .setLabel(`${safePage + 1} / ${computedTotal}`)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId('ts_next')
                .setLabel('Next')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji(EMOJI_RIGHT)
                .setDisabled(safePage >= computedTotal - 1)
        );
        container.addActionRowComponents(row);
    }

    container.addSeparatorComponents(sep());
    return v2([container]);
}
