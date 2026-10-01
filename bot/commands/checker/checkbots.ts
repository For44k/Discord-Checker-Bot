import { Message, ComponentType } from 'discord.js';
import { apiGet } from '../../services/api/apiService';
import {
    buildCheckBotsError,
    buildCheckBotsEmpty,
    buildCheckBotsPage,
    BOTS_PER_PAGE
} from '../../utils/ui/checker/checkbotsUI';
import { usageExampleReply } from '../../utils/ui/usages';

export default {
    name: 'checkbots',
    description: 'Scan a server and list all bots, including their roles and details',
    aliases: ['cb', 'listbots', 'serverbots'],

    async execute(message: Message, args: string[]) {
        const guildId = args[0] || message.guild?.id;
        if (!guildId || !/^\d{17,20}$/.test(guildId)) {
            return message.reply(usageExampleReply({
                commandName: 'checkbots',
                description: 'Scan a server and list all bots, including their roles and details',
                usage: '+cb <serverId>',
                user: message.author
            }));
        }

        let botsData: any;
        try {
            botsData = await apiGet(`/api/server-bots/${guildId}`);
        } catch {
            return message.reply(buildCheckBotsError());
        }

        if (!botsData || !botsData.success) {
            return message.reply(buildCheckBotsError());
        }

        const bots = botsData.bots || [];
        const gIconRaw = botsData.guildIcon || botsData.icon;
        const gIcon = gIconRaw ? (gIconRaw.startsWith('http') ? gIconRaw : `https://cdn.discordapp.com/icons/${guildId}/${gIconRaw}.png?size=512`) : 'https://cdn.discordapp.com/embed/avatars/0.png';
        const guildName = botsData.guildName || 'Unknown Server';

        if (bots.length === 0) {
            return message.reply(buildCheckBotsEmpty(guildName, gIcon, message));
        }

        const totalPages = Math.ceil(bots.length / BOTS_PER_PAGE) || 1;
        let currentPage = 0;

        const responseMsg = await message.reply(
            buildCheckBotsPage(bots, guildName, gIcon, currentPage, totalPages, message)
        );

        if (totalPages <= 1 || !responseMsg) return;

        const collector = responseMsg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 180_000,
            filter: (i: any) => i.user.id === message.author.id
        });

        collector.on('collect', async (i: any) => {
            try { await i.deferUpdate(); } catch (_) { }

            if (i.customId.startsWith('cb_prev')) {
                currentPage = Math.max(0, currentPage - 1);
            } else if (i.customId.startsWith('cb_next')) {
                currentPage = Math.min(totalPages - 1, currentPage + 1);
            } else {
                return;
            }

            try {
                await responseMsg.edit(
                    buildCheckBotsPage(bots, guildName, gIcon, currentPage, totalPages, message)
                );
            } catch (_) { }
        });
    }
};
