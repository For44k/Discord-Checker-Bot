import { Message, PermissionsBitField } from 'discord.js';
import { PrefixService } from '../../database/services/prefixStore';
import { buildCurrentPrefixPayload, buildPrefixUpdatedPayload } from '../../utils/ui/config/prefixUI';

export default {
    name: 'prefix',
    description: 'Change the bot prefix for this server',

    async execute(message: Message, args: string[]) {
        if (!message.member?.permissions?.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('Only administrators can change the bot prefix.');
        }

        const guildId = message.guild?.id;
        if (!guildId) return message.reply('This command must be used in a server.');

        const newPrefix = (args[0] || '').trim();

        if (!newPrefix) {
            const current = await PrefixService.get(guildId);
            const payload = buildCurrentPrefixPayload(current, message);
            return message.reply(payload);
        }

        await PrefixService.set(guildId, newPrefix);
        const payload = buildPrefixUpdatedPayload(newPrefix, message);
        return message.reply(payload);
    }
};
