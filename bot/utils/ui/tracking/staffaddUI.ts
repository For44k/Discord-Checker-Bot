import { ContainerBuilder } from 'discord.js';
import { EMBEDV2_COLOR, sep, text, v2 } from '../components';

const EMOJI_SUCCESS = '<:succes:1494764241142677686>';
const EMOJI_WARN = '<a:warning_animated:1352909221968220170>';

export function buildStaffAddAlreadyInList(roleDisplay: string): object {
    const c = new ContainerBuilder()
        .setAccentColor(EMBEDV2_COLOR)
        .addTextDisplayComponents(text(`# ${EMOJI_WARN} __Staff Role Already Monitored__`))
        .addSeparatorComponents(sep())
        .addTextDisplayComponents(
            text(
                `- __Target Role:__ ${roleDisplay}\n` +
                `- __Status:__ \`This role is already in the staff tracking roster\``
            )
        )
        .addSeparatorComponents(sep());
    return v2([c]);
}

export function buildStaffAddSuccess(roleDisplay: string, totalCount?: number, allRoles?: string[]): object {
    const totalLine = typeof totalCount === 'number' ? `\n- __Total Staff Roles:__ \`${totalCount}\` Roles Configured` : '';
    const listStr = allRoles && allRoles.length > 0
        ? `\n> - **__Current Roster:__** ${allRoles.map(r => `<@&${r}>`).join('  ・  ')}`
        : '';

    const c = new ContainerBuilder()
        .setAccentColor(EMBEDV2_COLOR)
        .addTextDisplayComponents(text(`# ${EMOJI_SUCCESS} __Staff Role Added__`))
        .addSeparatorComponents(sep())
        .addTextDisplayComponents(
            text(
                `- __Target Role:__ ${roleDisplay}\n` +
                `- __Status:__ \`Successfully added to monitored staff roster\`${totalLine}${listStr}`
            )
        )
        .addSeparatorComponents(sep());
    return v2([c]);
}
