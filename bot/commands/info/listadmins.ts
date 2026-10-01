import { Message, ComponentType } from 'discord.js';
import { apiGet } from '../../services/api/apiService';
import { buildListAdminsEmpty, buildListAdminsPage, ADMINS_PER_PAGE } from '../../utils/ui/info/listadminsUI';
import { usageExampleReply, errorReply } from '../../utils/ui/usages';
import { buildLoadingReply } from '../../utils/ui/general/loadingUI';
import { v2 } from '../../utils/ui/components';

export default {
    name: 'listadmins',
    description: 'List all admins of a server (by server ID), with the role(s) granting admin permission.',
    aliases: ['la', 'adminlist', 'admins'],

    async execute(message: Message, args: string[]) {
        const rawArg = args[0] ? args[0].replace(/[<@!&#>]/g, '').trim() : '';
        if (!rawArg || !/^\d{15,25}$/.test(rawArg)) {
            const usage = usageExampleReply({
                commandName: 'listadmins',
                description: 'Scan and list all administrators in a server',
                usage: '+listadmins <serverId>',
                example: '+listadmins 123456789012345678',
                user: message.author
            });
            return message.reply(usage);
        }

        const serverId = rawArg;
        const waitMsg = await message.reply(buildLoadingReply('Scanning server members and resolving admin roles...')).catch(() => null);

        let data: any;
        try {
            data = await apiGet(`/api/server-admins/${serverId}`);
        } catch (e: any) {
            const errPayload = errorReply({
                title: 'Fetching Failed',
                errors: [
                    "I can't find that server in any server",
                    "Try To correct id or serverId"
                ],
                user: message.author
            });
            return waitMsg ? waitMsg.edit(errPayload) : message.reply(errPayload);
        }

        if (!data || !data.success) {
            const errPayload = errorReply({
                title: 'Fetching Failed',
                errors: [
                    "I can't find that server in any server",
                    "Try To correct id or serverId"
                ],
                user: message.author
            });
            return waitMsg ? waitMsg.edit(errPayload) : message.reply(errPayload);
        }

        const rawAdmins = Array.isArray(data.admins) ? data.admins : [];
        const admins = rawAdmins.filter((a: any) => !a.bot && !a.user?.bot);
        const guildName = data.guildName || 'Unknown Server';
        const guildIcon = data.guildIcon || null;

        if (!admins.length) {
            const emptyPayload = buildListAdminsEmpty(guildName, serverId, guildIcon);
            return waitMsg ? waitMsg.edit(emptyPayload) : message.reply(emptyPayload);
        }

        const totalPages = Math.ceil(admins.length / ADMINS_PER_PAGE) || 1;
        let currentPage = 0;

        const pagePayload = buildListAdminsPage(admins, guildName, serverId, guildIcon, currentPage, totalPages, message);
        const responseMsg = waitMsg ? await waitMsg.edit(pagePayload) : await message.reply(pagePayload);

        if (totalPages <= 1 || !responseMsg) return;

        const collector = responseMsg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 180_000,
            filter: (i: any) => i.user.id === message.author.id
        });

        collector.on('collect', async (i: any) => {
            try { await i.deferUpdate(); } catch (_) { }

            if (i.customId.startsWith('la_prev')) {
                currentPage = Math.max(0, currentPage - 1);
            } else if (i.customId.startsWith('la_next')) {
                currentPage = Math.min(totalPages - 1, currentPage + 1);
            } else {
                return;
            }

            try {
                await responseMsg.edit(
                    buildListAdminsPage(admins, guildName, serverId, guildIcon, currentPage, totalPages, message)
                );
            } catch (_) { }
        });
    }
};
