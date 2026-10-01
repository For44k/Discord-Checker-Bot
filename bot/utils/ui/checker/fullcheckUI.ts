import {
    ContainerBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    TextDisplayBuilder,
    ButtonBuilder,
    ButtonStyle,
    parseEmoji,
    User,
    Client
} from 'discord.js';
import { sep, text, v2, headerSection } from '../components';
import { UserServerData, ServerRoleItem } from '../../../types/apiContracts';

const EMBEDV2_COLOR = 0xBBEDFF;
const EMOJI_HEADER = '<a:cutekuromis:1550907953027227738>';
const EMOJI_ROLES = '<:custom_emoji:1550907736999460885>';
const EMOJI_STATS = '<a:05_penguin_football:1550911039657214002>';
const EMOJI_LEFT = '<a:prev:1535661591276814436>';
const EMOJI_RIGHT = '<a:next:1537412085464571957>';

export interface ServerRoleData {
    id: string;
    name: string;
    permissions?: string[] | null;
    memberCount?: number | string;
    membersCount?: number | string;
    holders?: number | string;
}

export interface MutualServerData {
    guildId: string;
    guildName: string;
    guildIcon?: string | null;
    ownerId?: string | null;
    ownerTag: string;
    memberCount: string;
    isOwner: boolean;
    roles: ServerRoleData[];
}

export function buildFullcheckPage(
    user: User,
    servers: MutualServerData[],
    idx: number,
    _chunkIdx: number = 0,
    avatarUrl: string,
    authorId?: string
): object {
    if (!servers.length) {
        const c = new ContainerBuilder()
            .setAccentColor(EMBEDV2_COLOR)
            .addTextDisplayComponents(
                text(
                    `# ${EMOJI_HEADER} __Resolved User Roles Data__\n` +
                    `-# - __Across High Fidelity Servers..!!__`
                )
            )
            .addSeparatorComponents(sep())
            .addSectionComponents(headerSection(
                `# __No Mutual Servers Found__\n` +
                `- __Target User:__ <@${user.id}>\n` +
                `- __User ID:__ \`${user.id}\`\n` +
                `- __Shared Servers:__ \`0\``,
                avatarUrl
            ));
        return v2([c]);
    }

    const safeIndex = (idx >= 0 && idx < servers.length) ? idx : 0;
    const s = servers[safeIndex] || servers[0];

    const ownerId = s.ownerId || 'N/A';
    const ownerMention = ownerId !== 'N/A' ? `<@${ownerId}>` : (s.ownerTag || 'Unknown');
    const totalMembersFormatted = s.memberCount !== 'N/A' ? (String(s.memberCount).includes(',') ? String(s.memberCount) : (!isNaN(Number(s.memberCount)) ? Number(s.memberCount).toLocaleString() : String(s.memberCount))) : 'N/A';

    const container = new ContainerBuilder()
        .setAccentColor(EMBEDV2_COLOR)
        .addTextDisplayComponents(
            text(
                `# ${EMOJI_HEADER} __Resolved User Roles Data__\n` +
                `-# - __Across High Fidelity Servers..!!__`
            )
        )
        .addSeparatorComponents(sep())
        .addSectionComponents(
            headerSection(
                `## ${s.guildName}\n` +
                `- __Target User:__ <@${user.id}>\n` +
                `- __Server Owner:__ ${ownerMention}\n` +
                `- __Total Members:__ \`${totalMembersFormatted}\``,
                s.guildIcon || avatarUrl
            )
        )
        .addSeparatorComponents(sep());

    if (s.roles && s.roles.length > 0) {
        const displayRoles = s.roles.slice(0, 15);
        const remainingCount = s.roles.length - displayRoles.length;

        const roleDataLines = displayRoles.map(r => `> - __\`${r.name}\`__ | \`${r.id}\``).join('\n') +
            (remainingCount > 0 ? `\n> - *... and ${remainingCount} more role(s)*` : '');

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `## ${EMOJI_ROLES} __Roles Data__\n${roleDataLines}`
            )
        );
        container.addSeparatorComponents(sep());

        const roleStatsLines = displayRoles.map(r => {
            const holders = r.holders || r.membersCount || r.memberCount || '1';
            const holdersFormatted = holders !== 'N/A' ? (typeof holders === 'number' ? holders.toLocaleString() : (String(holders).includes(',') ? String(holders) : (!isNaN(Number(holders)) ? Number(holders).toLocaleString() : String(holders)))) : '1';
            return `- __${r.name} Holders:__ \`${holdersFormatted}\``;
        }).join('\n');

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `## ${EMOJI_STATS} __Role Statistics__\n${roleStatsLines}`
            )
        );
    } else {
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `## ${EMOJI_ROLES} __Roles Data__\n> - \`No roles reported for this server\``
            )
        );
    }

    const total = servers.length;

    if (total > 0) {
        const OWNER_EMOJI = { id: '1550936064380641342', name: 'UserDev', animated: true };

        const chunk1 = servers.slice(0, 25);
        const options1 = chunk1.map((sv, i) => {
            const opt = new StringSelectMenuOptionBuilder()
                .setLabel(`${i + 1}. ${sv.guildName}`.slice(0, 95))
                .setDescription(`${sv.isOwner ? 'OWNER • ' : ''}${sv.guildId} • ${sv.roles.length} role(s)`.slice(0, 95))
                .setValue(`${user.id}:${i}`)
                .setDefault(i === safeIndex);

            if (sv.isOwner) {
                opt.setEmoji(OWNER_EMOJI);
            }
            return opt;
        });

        const menu1 = new StringSelectMenuBuilder()
            .setCustomId(`fc_select${authorId ? `:${authorId}` : ""}`)
            .setPlaceholder(`Select Server (1–${chunk1.length} of ${total})...`)
            .setMinValues(1)
            .setMaxValues(1)
            .addOptions(options1);

        container.addSeparatorComponents(sep());
        container.addActionRowComponents(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu1));

        if (total > 25) {
            const chunk2 = servers.slice(25, 50);
            const options2 = chunk2.map((sv, i) => {
                const realIdx = 25 + i;
                const opt = new StringSelectMenuOptionBuilder()
                    .setLabel(`${realIdx + 1}. ${sv.guildName}`.slice(0, 95))
                    .setDescription(`${sv.isOwner ? 'OWNER • ' : ''}${sv.guildId} • ${sv.roles.length} role(s)`.slice(0, 95))
                    .setValue(`${user.id}:${realIdx}`)
                    .setDefault(realIdx === safeIndex);

                if (sv.isOwner) {
                    opt.setEmoji(OWNER_EMOJI);
                }
                return opt;
            });

            const menu2 = new StringSelectMenuBuilder()
                .setCustomId(`fc_select_2${authorId ? `:${authorId}` : ""}`)
                .setPlaceholder(`Select Server (26–${25 + chunk2.length} of ${total})...`)
                .setMinValues(1)
                .setMaxValues(1)
                .addOptions(options2);

            container.addActionRowComponents(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu2));
        }

        if (total > 50) {
            const chunk3 = servers.slice(50, 75);
            const options3 = chunk3.map((sv, i) => {
                const realIdx = 50 + i;
                const opt = new StringSelectMenuOptionBuilder()
                    .setLabel(`${realIdx + 1}. ${sv.guildName}`.slice(0, 95))
                    .setDescription(`${sv.isOwner ? 'OWNER • ' : ''}${sv.guildId} • ${sv.roles.length} role(s)`.slice(0, 95))
                    .setValue(`${user.id}:${realIdx}`)
                    .setDefault(realIdx === safeIndex);

                if (sv.isOwner) {
                    opt.setEmoji(OWNER_EMOJI);
                }
                return opt;
            });

            const menu3 = new StringSelectMenuBuilder()
                .setCustomId(`fc_select_3${authorId ? `:${authorId}` : ""}`)
                .setPlaceholder(`Select Server (51–${50 + chunk3.length} of ${total})...`)
                .setMinValues(1)
                .setMaxValues(1)
                .addOptions(options3);

            container.addActionRowComponents(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu3));
        }
    }

    return v2([container]);
}

export function formatApiServers(baseServers: Array<UserServerData | Record<string, any>>, client: Client, user: User): MutualServerData[] {
    const servers: MutualServerData[] = baseServers.map((s) => {
        let gOwnerId = (s as any).guild?.ownerId || (s as any).ownerId || (s as any).owner_id || null;
        let memberCount = (s as any).guild?.memberCount || (s as any).memberCount || (s as any).membersCount;
        let guildName = (s as any).guild?.name || (s as any).guildName || (s as any).name || 'Unknown Server';
        let guildIconRaw = (s as any).guild?.icon || (s as any).guildIcon || (s as any).icon || null;
        let guildId = (s as any).guild?.id || (s as any).guildId || (s as any).serverId || (s as any).id || 'unknown';
        let guildIcon: string | null = null;

        if (guildId !== 'unknown' && client.guilds) {
            const cachedGuild = client.guilds.cache.get(guildId);
            if (cachedGuild) {
                gOwnerId = cachedGuild.ownerId || gOwnerId;
                if (memberCount === undefined || memberCount === 'N/A' || !memberCount) memberCount = cachedGuild.memberCount;
                if (!guildName || guildName === 'Unknown Server') guildName = cachedGuild.name;
                guildIcon = cachedGuild.iconURL({ size: 512, extension: 'png' });
            }
        }

        if (!guildIcon && guildIconRaw) {
            const isFullUrl = /^https?:\/\//.test(guildIconRaw);
            guildIcon = isFullUrl
                ? guildIconRaw
                : `https://cdn.discordapp.com/icons/${guildId}/${guildIconRaw}.${guildIconRaw.startsWith('a_') ? 'gif' : 'png'}?size=512`;
        }

        const isOwner = gOwnerId ? (gOwnerId === user.id) : Boolean((s as any).isOwner || (s as any).member?.isOwner);
        const rolesList: ServerRoleItem[] = (s as any).roles || (s as any).dangerRoles || [];

        return {
            guildId,
            guildName,
            guildIcon,
            ownerId: gOwnerId || null,
            ownerTag: (s as any).guild?.ownerTag || (s as any).ownerTag || (gOwnerId ? `<@${gOwnerId}>` : 'Unknown'),
            memberCount: (memberCount !== undefined && memberCount !== null) ? Number(memberCount).toLocaleString() : 'N/A',
            isOwner,
            roles: rolesList.map((r) => ({
                id: r.id,
                name: r.name || 'Unknown',
                permissions: r.permissions || null,
                memberCount: (r as any).memberCount || (r as any).membersCount || (r as any).holders || undefined,
            })),
        };
    });

    servers.sort((a, b) => (b.isOwner ? 1 : 0) - (a.isOwner ? 1 : 0) || b.roles.length - a.roles.length);
    return servers;
}
