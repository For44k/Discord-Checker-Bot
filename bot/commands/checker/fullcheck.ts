import { Message } from 'discord.js';
import { resolveUser } from '../../services/userResolver';
import { fetchUserRoles } from '../../services/api/apiService';
import { buildFullcheckPage, formatApiServers, MutualServerData } from '../../utils/ui/checker/fullcheckUI';
import { usageExampleReply, userNotFoundReply } from '../../utils/ui/usages';
import { UserRolesResponse } from '../../types/apiContracts';

export const fullcheckCache = new Map<string, MutualServerData[]>();

export default {
    name: 'fullcheck',
    description: 'Detailed report: all shared servers + roles per server (select to switch)',
    aliases: ['fc', 'full', 'whois'],

    async execute(message: Message, args: string[]) {
        if (!args || !args[0]) {
            const usage = usageExampleReply({
                commandName: 'fullcheck',
                description: 'Investigate users across all monitored mutual servers',
                usage: '+fc @mention | ID | username',
                user: message.author
            });
            return message.reply(usage);
        }

        const user = await resolveUser(message, args);
        if (!user) {
            return message.reply(userNotFoundReply());
        }

        const avatarUrl = user.displayAvatarURL({ size: 512, extension: 'png' });

        let rolesData: UserRolesResponse | null = null;
        try {
            rolesData = await fetchUserRoles(user.id);
        } catch {}

        if (!rolesData || !rolesData.data) {
            return message.reply(userNotFoundReply());
        }

        const baseServers = rolesData.data || [];
        const formattedServers = formatApiServers(baseServers as any, message.client, user);
        fullcheckCache.set(user.id, formattedServers);

        const authorId = message.author.id;
        const payload = buildFullcheckPage(user, formattedServers, 0, 0, avatarUrl, authorId);
        return message.reply(payload);
    }
};
