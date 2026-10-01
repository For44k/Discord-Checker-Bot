import { ContainerBuilder } from 'discord.js';
import { EMBEDV2_COLOR, sep, text, v2 } from '../components';

const EMOJI_SUCCESS = '<:succes:1494764241142677686>';
const EMOJI_WARN = '<a:warning_animated:1352909221968220170>';

export function buildStaffRemoveNotInList(roleDisplay: string): object {
    const c = new ContainerBuilder()
        .setAccentColor(EMBEDV2_COLOR)
        .addTextDisplayComponents(text(`# ${EMOJI_WARN} __Staff Role Not Found__`))
        .addSeparatorComponents(sep())
        .addTextDisplayComponents(
            text(
                `- __Target Role:__ ${roleDisplay}\n` +
                `- __Status:__ \`This role is not present in the staff tracking roster\``
            )
        )
        .addSeparatorComponents(sep());
    return v2([c]);
}

export function buildStaffRemoveSuccess(roleDisplay: string, totalCount?: number, remainingRoles?: string[]): object {
    const totalLine = typeof totalCount === 'number' ? `\n- __Remaining Staff Roles:__ \`${totalCount}\` Roles Configured` : '';
    const listStr = remainingRoles && remainingRoles.length > 0
        ? `\n> - **__Current Roster:__** ${remainingRoles.map(r => `<@&${r}>`).join('  ・  ')}`
        : '\n> - *No staff roles remaining in configuration.*';

    const c = new ContainerBuilder()
        .setAccentColor(EMBEDV2_COLOR)
        .addTextDisplayComponents(text(`# ${EMOJI_SUCCESS} __Staff Role Removed__`))
        .addSeparatorComponents(sep())
        .addTextDisplayComponents(
            text(
                `- __Target Role:__ ${roleDisplay}\n` +
                `- __Status:__ \`Successfully removed from monitored staff roster\`${totalLine}${listStr}`
            )
        )
        .addSeparatorComponents(sep());
    return v2([c]);
}
