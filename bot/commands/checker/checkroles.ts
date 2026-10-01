import { Message } from 'discord.js';
import { resolveUser } from '../../services/userResolver';
import { fetchDangerRoles } from '../../services/api/apiService';
import { buildCheckRolesPayload } from '../../utils/ui/checker/checkrolesUI';
import { usageExampleReply, userNotFoundReply } from '../../utils/ui/usages';
import { DangerRolesResponse } from '../../types/apiContracts';

export const checkrolesCache = new Map<string, DangerRolesResponse>();

export default {
    name: 'checkroles',
    description: 'List the dangerous roles a user has across servers',
    aliases: ['cr', 'checkrole', 'roles'],

    async execute(message: Message, args: string[]) {
        if (!args || !args[0]) {
            const usage = usageExampleReply({
                commandName: 'checkroles',
                description: 'Scan all mutual servers for dangerous administrative roles and permissions',
                usage: '+cr @mention | ID | username',
                user: message.author
            });
            return message.reply(usage);
        }

        const user = await resolveUser(message, args);
        if (!user) {
            return message.reply(userNotFoundReply());
        }

        let apiResult: DangerRolesResponse | null = null;
        try {
            apiResult = await fetchDangerRoles(user.id);
        } catch {}

        if (!apiResult) {
            return message.reply(userNotFoundReply());
        }

        checkrolesCache.set(user.id, apiResult);
        const authorId = message.author.id;
        const payload = await buildCheckRolesPayload(user, apiResult, 0, message, authorId);
        return message.reply(payload);
    }
};
