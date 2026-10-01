import { ContainerBuilder, Message } from 'discord.js';
import { sep, text, v2 } from '../../utils/ui/components';

export default {
    name: 'checkconnections',
    description: 'Check connections',
    async execute(message: Message, args: string[]) {
        return message.reply(v2([new ContainerBuilder().setAccentColor(0x5865F2).addTextDisplayComponents(text('## Connections Report'))]));
    }
};
