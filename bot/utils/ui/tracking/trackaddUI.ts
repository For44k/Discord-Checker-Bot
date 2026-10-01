import { ContainerBuilder, Message } from 'discord.js';
import { EMBEDV2_COLOR, sep, text, v2 } from '../components';

const EMOJI_SUCCESS = '<:succes:1494764241142677686>';
const EMOJI_WARN = '<a:warning_animated:1352909221968220170>';

export function buildTrackAddAlreadyTracked(roleDisplay: string, _message?: Message): object {
    const c = new ContainerBuilder()
        .setAccentColor(EMBEDV2_COLOR)
        .addTextDisplayComponents(text(`# ${EMOJI_WARN} __Staff Role Already Tracked__`))
        .addSeparatorComponents(sep())
        .addTextDisplayComponents(
            text(
                `- __Target Role:__ ${roleDisplay}\n` +
                `- __Status:__ \`This role is already registered in staff tracking\``
            )
        )
        .addSeparatorComponents(sep());
    return v2([c]);
}

export function buildTrackAddSuccess(roleDisplay: string, roles: string[], message: Message): object {
    const listStr = roles.length > 0
        ? `\n> - **__Active Staff Roster:__** ${roles.map(r => `<@&${r}>`).join('  ・  ')}`
        : '';

    const c = new ContainerBuilder()
        .setAccentColor(EMBEDV2_COLOR)
        .addTextDisplayComponents(text(`# ${EMOJI_SUCCESS} __Staff Role Registered__`))
        .addSeparatorComponents(sep())
        .addTextDisplayComponents(
            text(
                `- __Target Role:__ ${roleDisplay}\n` +
                `- __Server:__ \`${message.guild?.name || 'This Server'}\`\n` +
                `- __Total Monitored Roles:__ \`${roles.length}\` Roles Configured${listStr}`
            )
        )
        .addSeparatorComponents(sep());
    return v2([c]);
}
