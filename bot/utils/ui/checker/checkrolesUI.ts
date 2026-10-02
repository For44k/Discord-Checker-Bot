import {
    ContainerBuilder,
    TextDisplayBuilder,
    StringSelectMenuBuilder,
    ActionRowBuilder,
    User
} from 'discord.js';
import { sep, text, v2, headerSection, EMBEDV2_COLOR } from '../components';
import { DangerRolesResponse, DangerRoleItem } from '../../../types/apiContracts';

const EMOJI_HEADER = '<a:cutekuromis:1550907953027227738>';
const EMOJI_SAFE = '<a:ice:1543392867219677274>';

function safeText(str: string, maxLen: number): string {
    if (!str) return '';
    return str.length > maxLen ? str.substring(0, maxLen - 3) + '...' : str;
}

function getRolePerms(r: DangerRoleItem | Record<string, unknown>): string[] {
    if (r && typeof r === 'object' && 'permissions' in r && Array.isArray(r.permissions)) {
        return r.permissions.map((p: unknown) => String(p).trim().toUpperCase()).filter(Boolean);
    }
    return [];
}

export async function buildCheckRolesPayload(
    user: User,
    data: DangerRolesResponse | Record<string, unknown>,
    page: number,
    _context?: unknown,
    authorId?: string
): Promise<object> {
    const avatar = user.displayAvatarURL({ size: 512, extension: 'png' });

    const rawData = data as Record<string, unknown>;
    const all = (Array.isArray(rawData?.data)
        ? rawData.data
        : Array.isArray(rawData?.servers)
            ? rawData.servers
            : []) as Array<Record<string, unknown>>;

    const flagged = all.filter((s: Record<string, unknown>) => Array.isArray(s.dangerRoles) && s.dangerRoles.length > 0);
    const shared = typeof rawData?.sharedServers === 'number' ? rawData.sharedServers : all.length;

    if (!flagged.length) {
        const c = new ContainerBuilder()
            .setAccentColor(EMBEDV2_COLOR)
            .addTextDisplayComponents(
                text(
                    `# ${EMOJI_HEADER} __Reviewing User Roles__\n` +
                    `-# - __Across High Fidelity Servers..!!__`
                )
            )
            .addSeparatorComponents(sep())
            .addSectionComponents(
                headerSection(
                    `# ${EMOJI_SAFE} __User is Safe__\n` +
                    `- __Target User:__ <@${user.id}>\n` +
                    `- __User ID:__ \`${user.id}\`\n` +
                    `- __Shared Servers:__ **\`${shared}\`**\n` +
                    `- __Dangerous Roles:__ **\`0\`**`,
                    avatar
                )
            );

        return v2([c]);
    }

    const safeIndex = (page >= 0 && page < flagged.length) ? page : 0;
    const s = flagged[safeIndex];
    const guildObj = typeof s.guild === 'object' && s.guild !== null ? (s.guild as Record<string, unknown>) : null;
    const guildName = String(guildObj?.name || s.guildName || 'Unknown Server');
    const guildId = String(guildObj?.id || guildObj?.serverId || s.guildId || s.serverId || 'unknown');
    const guildIcon = (guildObj?.icon || s.guildIcon) as string | null | undefined;

    let gIconUrl: string | undefined = undefined;
    if (guildIcon && typeof guildIcon === 'string') {
        const isUrl = /^https?:\/\//.test(guildIcon);
        gIconUrl = isUrl ? guildIcon : `https://cdn.discordapp.com/icons/${guildId}/${guildIcon}.${guildIcon.startsWith('a_') ? 'gif' : 'png'}?size=512`;
    }

    const ownerId = String(guildObj?.ownerId || s.ownerId || 'N/A');
    const ownerMention = ownerId !== 'N/A' ? `<@${ownerId}>` : 'Unknown';
    const memberCount = guildObj?.memberCount ?? s.memberCount ?? s.membersCount ?? 'N/A';
    const totalMembersFormatted = memberCount !== 'N/A' ? (typeof memberCount === 'number' ? memberCount.toLocaleString() : (String(memberCount).includes(',') ? String(memberCount) : (!isNaN(Number(memberCount)) ? Number(memberCount).toLocaleString() : String(memberCount)))) : 'N/A';

    const dangerRoles = (Array.isArray(s.dangerRoles) ? s.dangerRoles : []) as Array<DangerRoleItem | Record<string, unknown>>;
    const top3Roles = dangerRoles.slice(0, 3);

    const container = new ContainerBuilder()
        .setAccentColor(EMBEDV2_COLOR)
        .addTextDisplayComponents(
            text(
                `# ${EMOJI_HEADER} __Reviewing User Roles__\n` +
                `-# - __Across High Fidelity Servers..!!__`
            )
        )
        .addSeparatorComponents(sep())
        .addSectionComponents(
            headerSection(
                `## ${guildName}\n` +
                `- __Target User:__ <@${user.id}>\n` +
                `- __Server Owner:__ ${ownerMention}\n` +
                `- __Total Members:__ \`${totalMembersFormatted}\``,
                gIconUrl || avatar
            )
        );

    top3Roles.forEach((role: DangerRoleItem | Record<string, unknown>) => {
        const roleObj = typeof role === 'object' && role !== null ? (role as Record<string, unknown>) : null;
        const rName = (typeof role === 'string' ? role : typeof roleObj?.name === 'string' ? roleObj.name : '').trim() || 'Unknown Role';
        const rId = typeof role === 'string' ? 'N/A' : (typeof roleObj?.id === 'string' ? roleObj.id : 'N/A');
        const permsList = roleObj ? getRolePerms(roleObj) : [];
        const permsDisplay = permsList.length ? permsList.map(p => `\`${p}\``).join(', ') : '`NONE`';

        const rawHolders = roleObj?.holders ?? roleObj?.membersCount ?? roleObj?.memberCount;
        const holdersFormatted = (rawHolders !== undefined && rawHolders !== null && rawHolders !== 'N/A')
            ? (typeof rawHolders === 'number' ? rawHolders.toLocaleString() : (String(rawHolders).includes(',') ? String(rawHolders) : (!isNaN(Number(rawHolders)) ? Number(rawHolders).toLocaleString() : String(rawHolders))))
            : '1';

        container.addSeparatorComponents(sep());
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `> - __\`${rName}\`__ | \`${rId}\`\n` +
                `- __Role Holders:__ **\`${holdersFormatted}\`**\n` +
                `- __Permissions:__ ${permsDisplay}`
            )
        );
    });

    const total = flagged.length;

    if (total > 0) {
        const chunk1 = flagged.slice(0, 25);
        const options1 = chunk1.map((f: Record<string, unknown>, idx: number) => {
            const fGuild = typeof f.guild === 'object' && f.guild !== null ? (f.guild as Record<string, unknown>) : null;
            const name = String(fGuild?.name || f.guildName || 'Unknown Server');
            return {
                label: `${idx + 1}. ${safeText(name, 90)}`,
                value: `${user.id}:${idx}`,
                default: idx === safeIndex
            };
        });

        const menu1 = new StringSelectMenuBuilder()
            .setCustomId(`cr_select${authorId ? `:${authorId}` : ""}`)
            .setPlaceholder(`Select Server (1–${chunk1.length} of ${total})...`)
            .addOptions(options1);

        container.addSeparatorComponents(sep());
        container.addActionRowComponents(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu1));

        if (total > 25) {
            const chunk2 = flagged.slice(25, 50);
            const options2 = chunk2.map((f: Record<string, unknown>, i: number) => {
                const realIdx = 25 + i;
                const fGuild = typeof f.guild === 'object' && f.guild !== null ? (f.guild as Record<string, unknown>) : null;
                const name = String(fGuild?.name || f.guildName || 'Unknown Server');
                return {
                    label: `${realIdx + 1}. ${safeText(name, 90)}`,
                    value: `${user.id}:${realIdx}`,
                    default: realIdx === safeIndex
                };
            });

            const menu2 = new StringSelectMenuBuilder()
                .setCustomId(`cr_select_2${authorId ? `:${authorId}` : ""}`)
                .setPlaceholder(`Select Server (26–${25 + chunk2.length} of ${total})...`)
                .addOptions(options2);

            container.addActionRowComponents(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu2));
        }
    }

    return v2([container]);
}
