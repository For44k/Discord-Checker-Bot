import { ContainerBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Message, Guild } from 'discord.js';
import { EMBEDV2_COLOR, sep, text, v2 } from '../components';

const SUPPORT_URL = process.env.SUPPORT_SERVER || process.env.SUPPORT_SERVER_URL || 'https://discord.gg/XEs8UAWhdY';
const EMOJI_HEADER = '<a:cutekuromis:1550907953027227738>';
const EMOJI_SHIELD = '<:custom_emoji:1550907736999460885>';
const EMOJI_RADAR = '<a:05_penguin_football:1550911039657214002>';
const EMOJI_SUCCESS = '<:succes:1494764241142677686>';
const EMOJI_STAR = '<a:white_stars:1547180877962944585>';
const EMOJI_USERS = '<:user:1550907736999460885>';

export function buildCheckerSystemPayload(currentPrefix: string, _message?: Message): object {
    const joinButton = new ButtonBuilder()
        .setLabel('Join Support Server')
        .setStyle(ButtonStyle.Link)
        .setURL(SUPPORT_URL);

    const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(joinButton);

    const c = new ContainerBuilder()
        .setAccentColor(EMBEDV2_COLOR)
        .addTextDisplayComponents(
            text(
                `# ${EMOJI_HEADER} __Checker & Bot Access Management__\n` +
                `-# - __Multi-Server Telemetry & Granular Permission Control__`
            )
        )
        .addSeparatorComponents(sep())
        .addTextDisplayComponents(
            text(
                `## ${EMOJI_SHIELD} __Checker Permission Controls__\n` +
                `- \`${currentPrefix}checker add <@role/@user/id>\` - Authorize a role or user to use bot commands\n` +
                `- \`${currentPrefix}checker remove <@role/@user/id>\` - Revoke authorization from a role or user\n` +
                `- \`${currentPrefix}checker list\` - View all authorized checker roles and users\n` +
                `- \`${currentPrefix}prefix <new_prefix>\` - Customize the bot command prefix`
            )
        )
        .addSeparatorComponents(sep())
        .addTextDisplayComponents(
            text(
                `## ${EMOJI_RADAR} __Staff Tracking & Intelligence__\n` +
                `- \`${currentPrefix}staffadd <@role/id>\` - Add a server role to the monitored staff roster\n` +
                `- \`${currentPrefix}staffremove <@role/id>\` - Remove a role from the staff roster\n` +
                `- \`${currentPrefix}stafflist\` - List all currently monitored staff roles\n` +
                `- \`${currentPrefix}trackstaff\` / \`${currentPrefix}ts\` - Live staff voice activity & presence\n` +
                `- \`${currentPrefix}checkvoice <@user/id>\` / \`${currentPrefix}cv\` - Trace user voice channels across mutual servers\n` +
                `- \`${currentPrefix}checkbots\` / \`${currentPrefix}cb\` - Audit automated bots and permissions\n` +
                `- \`${currentPrefix}listadmins\` / \`${currentPrefix}admins\` - Audit privileged administrator accounts`
            )
        )
        .addSeparatorComponents(sep())
        .addTextDisplayComponents(
            text(
                `> - **__Shortcuts:__** \`${currentPrefix}checkeradd\`, \`${currentPrefix}checkerremove\`, \`${currentPrefix}checkerlist\``
            )
        )
        .addSeparatorComponents(sep())
        .addActionRowComponents(buttonRow)
        .addSeparatorComponents(sep());

    return v2([c]);
}

export function buildCheckerAddSuccessPayload(
    type: 'role' | 'user',
    target: { id: string; name: string; tag?: string },
    totalRoles: number,
    totalUsers: number
): object {
    const isRole = type === 'role';
    const targetMention = isRole ? `<@&${target.id}>` : `<@${target.id}>`;
    const typeLabel = isRole ? 'Server Role' : 'User / Member';
    const descText = isRole
        ? `Granted all members with this role full authorization to use bot commands`
        : `Granted direct individual authorization to use bot commands`;

    const c = new ContainerBuilder()
        .setAccentColor(EMBEDV2_COLOR)
        .addTextDisplayComponents(text(`# ${EMOJI_STAR} __Checker Access Authorized__`))
        .addSeparatorComponents(sep())
        .addTextDisplayComponents(
            text(
                `- __Target Type:__ \`${typeLabel}\`\n` +
                `- __Target:__ ${targetMention} (\`${target.name}\` | \`${target.id}\`)\n` +
                `- __Status:__ \`${descText}\`\n` +
                `- __Active Roster:__ \`${totalRoles}\` Roles • \`${totalUsers}\` Users Authorized`
            )
        )
        .addSeparatorComponents(sep());

    return v2([c]);
}

export function buildCheckerRemoveSuccessPayload(
    type: 'role' | 'user',
    targetId: string,
    totalRoles: number,
    totalUsers: number
): object {
    const isRole = type === 'role';
    const targetMention = isRole ? `<@&${targetId}>` : `<@${targetId}>`;
    const typeLabel = isRole ? 'Server Role' : 'User / Member';
    const descText = isRole
        ? `Revoked bot usage permissions from role`
        : `Revoked direct bot usage permissions from user`;

    const c = new ContainerBuilder()
        .setAccentColor(EMBEDV2_COLOR)
        .addTextDisplayComponents(text(`# ${EMOJI_SUCCESS} __Checker Access Revoked__`))
        .addSeparatorComponents(sep())
        .addTextDisplayComponents(
            text(
                `- __Target Type:__ \`${typeLabel}\`\n` +
                `- __Target:__ ${targetMention} | \`${targetId}\`\n` +
                `- __Status:__ \`${descText}\`\n` +
                `- __Remaining Roster:__ \`${totalRoles}\` Roles • \`${totalUsers}\` Users Active`
            )
        )
        .addSeparatorComponents(sep());

    return v2([c]);
}

export function buildCheckerListPayload(
    guild: Guild,
    roleIds: string[],
    userIds: string[]
): object {
    const hasRoles = roleIds && roleIds.length > 0;
    const hasUsers = userIds && userIds.length > 0;

    if (!hasRoles && !hasUsers) {
        const c = new ContainerBuilder()
            .setAccentColor(EMBEDV2_COLOR)
            .addTextDisplayComponents(
                text(
                    `# ${EMOJI_HEADER} __Checker Authorization Roster__\n` +
                    `> - **__Configured Bot Access Permissions__**`
                )
            )
            .addSeparatorComponents(sep())
            .addTextDisplayComponents(
                text(
                    `- __Status:__ \`No custom checker roles or users configured\`\n` +
                    `- __Default Access:__ \`Server Administrators & Owner have full access\`\n` +
                    `- __Setup:__ Use \`+checker add <@role/@user/id>\` to grant access to a role or user`
                )
            )
            .addSeparatorComponents(sep());
        return v2([c]);
    }

    const c = new ContainerBuilder()
        .setAccentColor(EMBEDV2_COLOR)
        .addTextDisplayComponents(
            text(
                `# ${EMOJI_HEADER} __Checker Authorization Roster__\n` +
                `> - **__Server:__** \`${guild.name}\` | Total: \`${roleIds.length + userIds.length}\` authorized`
            )
        )
        .addSeparatorComponents(sep());

    if (hasRoles) {
        const roleLines = roleIds.map((id, idx) => {
            const role = guild.roles.cache.get(id);
            return role
                ? `- \`${idx + 1}.\` <@&${id}> | \`${id}\``
                : `- \`${idx + 1}.\` \`${id}\` *(Role removed from server)*`;
        }).join('\n');

        c.addTextDisplayComponents(
            text(
                `## ${EMOJI_SHIELD} __Authorized Roles (${roleIds.length})__\n${roleLines}`
            )
        );
        c.addSeparatorComponents(sep());
    }

    if (hasUsers) {
        const userLines = userIds.map((id, idx) => {
            const member = guild.members.cache.get(id);
            return member
                ? `- \`${idx + 1}.\` <@${id}> (\`${member.user.tag || member.user.username}\`) | \`${id}\``
                : `- \`${idx + 1}.\` <@${id}> | \`${id}\``;
        }).join('\n');

        c.addTextDisplayComponents(
            text(
                `## ${EMOJI_RADAR} __Authorized Users (${userIds.length})__\n${userLines}`
            )
        );
        c.addSeparatorComponents(sep());
    }

    c.addTextDisplayComponents(
        text(
            `> - **__Default Access:__** \`Server Administrators & Owner always have full permission\``
        )
    );
    c.addSeparatorComponents(sep());

    return v2([c]);
}
