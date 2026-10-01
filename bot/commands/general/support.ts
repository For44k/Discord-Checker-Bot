import { Message } from 'discord.js';
import { buildSupportPayload } from '../../utils/ui/general/supportUI';

export default {
    name: 'support',
    description: 'Open the support panel.',
    aliases: ['sp', 'suport', 'contact'],

    async execute(message: Message, _args: string[]) {
        const botName = message.client.user?.username || 'Checker';
        const botIcon = message.client.user?.displayAvatarURL({ size: 512, extension: 'png' }) || 'https://cdn.discordapp.com/embed/avatars/0.png';

        const payload = buildSupportPayload(botName, botIcon);
        return message.reply(payload);
    }
};
