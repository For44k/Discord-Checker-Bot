import { ContainerBuilder, Message } from 'discord.js';
import { sep, text, v2 } from '../../utils/ui/components';

export default {
    name: 'bl',
    description: 'Blacklist',
    async execute(message: Message, args: string[]) {
        return message.reply(v2([new ContainerBuilder().setAccentColor(0xED4245).addTextDisplayComponents(text('## Blacklist Updated'))]));
    }
};
