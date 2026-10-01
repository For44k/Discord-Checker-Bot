import { Message } from 'discord.js';
import { resolveUser } from '../../services/userResolver';
import { fetchUserVoice } from '../../services/api/apiService';
import { buildCheckVoicePayload } from '../../utils/ui/checker/checkvoiceUI';
import { usageExampleReply, userNotFoundReply } from '../../utils/ui/usages';
import { UserVoiceResponse } from '../../types/apiContracts';

export default {
    name: 'checkvoice',
    description: 'Check if a user is currently in any voice channel (live)',
    aliases: ['cv', 'voicecheck'],

    async execute(message: Message, args: string[]) {
        if (!args || !args[0]) {
            const usage = usageExampleReply({
                commandName: 'checkvoice',
                description: 'Check if a user is currently live in any voice channel across mutual servers',
                usage: '+cv @mention | ID | username',
                user: message.author
            });
            return message.reply(usage);
        }

        const user = await resolveUser(message, args);
        if (!user) {
            return message.reply(userNotFoundReply());
        }

        let apiResult: UserVoiceResponse | null = null;
        try {
            apiResult = await fetchUserVoice(user.id);
        } catch {}

        if (!apiResult) {
            return message.reply(userNotFoundReply());
        }

        const payload = buildCheckVoicePayload(user, apiResult as any);
        return message.reply(payload);
    }
};
