import { ContainerBuilder, Message } from 'discord.js';
import { EMBEDV2_COLOR, sep, text, v2 } from '../components';

const EMOJI_HEADER = '<a:cutekuromis:1550907953027227738>';
const EMOJI_SHIELD = '<:custom_emoji:1550907736999460885>';

export function buildStaffListEmpty(): object {
    const c = new ContainerBuilder()
        .setAccentColor(EMBEDV2_COLOR)
        .addTextDisplayComponents(
            text(
                `# ${EMOJI_HEADER} __Staff Roster Configuration__\n` +
                `> - **__No Monitored Staff Roles Found__**`
            )
        )
        .addSeparatorComponents(sep())
        .addTextDisplayComponents(
            text(
                `- __Status:__ \`No staff roles configured yet\`\n` +
                `- __Setup:__ Use \`+staffadd <@role/id>\` to add a role to track`
            )
        )
        .addSeparatorComponents(sep());
    return v2([c]);
}

export function buildStaffListPayload(roles: string[], message: Message): object {
    const lines = roles.map((id, i) => {
        const role = message.guild?.roles.cache.get(id);
        return role
            ? `- \`${i + 1}.\` <@&${role.id}> | \`${role.id}\``
            : `- \`${i + 1}.\` \`${id}\` *(Role removed from server)*`;
    }).join('\n');

    const c = new ContainerBuilder()
        .setAccentColor(EMBEDV2_COLOR)
        .addTextDisplayComponents(
            text(
                `# ${EMOJI_HEADER} __Staff Roster Configuration__\n` +
                `> - **__Server:__** \`${message.guild?.name || 'This Server'}\``
            )
        )
        .addSeparatorComponents(sep())
        .addTextDisplayComponents(
            text(
                `## ${EMOJI_SHIELD} __Monitored Roles (${roles.length})__\n${lines}`
            )
        )
        .addSeparatorComponents(sep());

    return v2([c]);
}
