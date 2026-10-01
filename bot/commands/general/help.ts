import { Message } from 'discord.js';
import { PrefixService } from '../../database/services/prefixStore';
import {
    buildHelpMainPayload,
    buildHelpCategoryPayload,
    helpCategories
} from '../../utils/ui/general/helpUI';

export default {
    name: 'help',
    description: 'Show the bot interactive help menu.',
    aliases: ['h', 'commands'],

    async execute(message: Message) {
        const guild = message.guild;
        const currentPrefix = PrefixService.getSync(guild?.id || 'dm') || '+';

        let botAvatarURL = 'https://cdn.discordapp.com/embed/avatars/0.png';
        let botName = '2321';
        if (guild?.members?.me) {
            botAvatarURL = guild.members.me.displayAvatarURL({ extension: 'png', size: 128 });
            botName = guild.members.me.displayName || guild.client.user?.username || '2321';
        } else if (guild?.client?.user) {
            botAvatarURL = guild.client.user.displayAvatarURL({ extension: 'png', size: 128 });
            botName = guild.client.user.username;
        }

        let currentCategory: string | null = null;
        let currentPage = 0;

        const mainPayload = buildHelpMainPayload(currentPrefix, botAvatarURL, botName, false);
        const sentMessage = await message.reply(mainPayload as Parameters<Message['reply']>[0]);

        if (!sentMessage) return;

        const collector = sentMessage.createMessageComponentCollector({
            time: 120000,
            filter: (i) => i.user.id === message.author.id,
        });

        collector.on('collect', async (interaction) => {
            try {
                if (interaction.customId === 'help_category_select' && interaction.isStringSelectMenu()) {
                    currentCategory = interaction.values[0];
                    currentPage = 0;
                    if (currentCategory) {
                        const payload = buildHelpCategoryPayload(currentCategory, currentPrefix, botAvatarURL, botName, currentPage, false);
                        await interaction.update(payload as Parameters<typeof interaction.update>[0]);
                    }
                } else if (interaction.customId === 'help_next' || interaction.customId === 'next_page') {
                    if (currentCategory) {
                        currentPage++;
                        const payload = buildHelpCategoryPayload(currentCategory, currentPrefix, botAvatarURL, botName, currentPage, false);
                        await interaction.update(payload as Parameters<typeof interaction.update>[0]);
                    }
                } else if (interaction.customId === 'help_prev' || interaction.customId === 'prev_page') {
                    if (currentCategory) {
                        currentPage = Math.max(0, currentPage - 1);
                        const payload = buildHelpCategoryPayload(currentCategory, currentPrefix, botAvatarURL, botName, currentPage, false);
                        await interaction.update(payload as Parameters<typeof interaction.update>[0]);
                    }
                }
            } catch (err: unknown) {
                const messageText = err instanceof Error ? err.message : String(err);
                console.error('[help collector error]', messageText);
            }
        });

        collector.on('end', async () => {
            try {
                if (!currentCategory) {
                    const payload = buildHelpMainPayload(currentPrefix, botAvatarURL, botName, true);
                    await sentMessage.edit(payload as Parameters<Message['edit']>[0]);
                } else {
                    const payload = buildHelpCategoryPayload(currentCategory, currentPrefix, botAvatarURL, botName, currentPage, true);
                    await sentMessage.edit(payload as Parameters<Message['edit']>[0]);
                }
            } catch {}
        });
    },
};
