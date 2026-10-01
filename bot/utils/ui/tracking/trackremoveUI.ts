import { ContainerBuilder, Message } from 'discord.js';
import { EMBEDV2_COLOR, sep, text, v2 } from '../components';

const EMOJI_SUCCESS = '<:succes:1494764241142677686>';
const EMOJI_WARN = '<a:warning_animated:1352909221968220170>';

export function buildTrackRemoveNotTracked(roleDisplay: string, _message?: Message): object {
    const c = new ContainerBuilder()
        .setAccentColor(EMBEDV2_COLOR)
        .addTextDisplayComponents(text(`# ${EMOJI_WARN} __Staff Role Not Found__`))
        .addSeparatorComponents(sep())
        .addTextDisplayComponents(
            text(
                `- __Target Role:__ ${roleDisplay}\n` +
                `- __Status:__ \`This role is not in the staff tracking list\``
            )
        )
        .addSeparatorComponents(sep());
    return v2([c]);
}

export function buildTrackRemoveSuccess(roleDisplay: string, removed: string[], message: Message): object {
    const listStr = removed.length > 0
        ? `\n> - **__Active Staff Roster:__** ${removed.map(r => `<@&${r}>`).join('  ・  ')}`
        : '\n> - *No staff roles remaining in configuration.*';

    const c = new ContainerBuilder()
        .setAccentColor(EMBEDV2_COLOR)
        .addTextDisplayComponents(text(`# ${EMOJI_SUCCESS} __Staff Role Removed__`))
        .addSeparatorComponents(sep())
        .addTextDisplayComponents(
            text(
                `- __Target Role:__ ${roleDisplay}\n` +
                `- __Server:__ \`${message.guild?.name || 'This Server'}\`\n` +
                `- __Remaining Monitored Roles:__ \`${removed.length}\` Roles Configured${listStr}`
            )
        )
        .addSeparatorComponents(sep());
    return v2([c]);
}
