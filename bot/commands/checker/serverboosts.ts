import {
    ContainerBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    TextDisplayBuilder,
    Message
} from 'discord.js';
import { resolveUser } from '../../services/userResolver';
import { apiGet } from '../../services/api/apiService';
import { sep, text, v2, headerSection } from '../../utils/ui/components';
import { usageExampleReply, errorReply, userNotFoundReply } from '../../utils/ui/usages';

const EMBEDV2_COLOR = 0xBBEDFF;
const EMOJI_HEADER = '<a:cutekuromis:1550907953027227738>';
const EMOJI_BOOST = '<:custom_emoji:1550907736999460885>';
const EMOJI_SAFE = '<a:ice:1543392867219677274>';
const EMOJI_LEFT = '<a:prev:1535661591276814436>';
const EMOJI_RIGHT = '<a:next:1537412085464571957>';

export default {
    name: 'serverboosts',
    description: 'Check guilds a user is boosting',
    aliases: ['checkboosts', 'boosts', 'sb', 'checkboost'],

    async execute(message: Message | any, args: string[]) {
        if (!args || args.length === 0) {
            return message.reply(usageExampleReply({
                commandName: 'serverboosts',
                description: 'Displays servers that the target user is currently boosting',
                usage: '+sb @mention | ID | username',
                user: message.author || message.user
            }));
        }

        const user = await resolveUser(message, args);
        if (!user) {
            return message.reply(userNotFoundReply());
        }

        const avatar = user.displayAvatarURL({ size: 512, extension: 'png' });

        let data: any = null;
        try {
            data = await apiGet(`/api/user-boost/${user.id}`, 0, false);
        } catch (_) { }

        const boosts = data?.boosts || [];

        if (!boosts.length) {
            const c = new ContainerBuilder()
                .setAccentColor(EMBEDV2_COLOR)
                .addTextDisplayComponents(
                    text(
                        `# ${EMOJI_HEADER} __User Server Boosts Audit__\n` +
                        `> - **__Active Boost Allocations & Tier Levels__**`
                    )
                )
                .addSeparatorComponents(sep())
                .addSectionComponents(
                    headerSection(
                        `# ${EMOJI_SAFE} __No Boosts Detected__\n` +
                        `- __Target User:__ <@${user.id}>\n` +
                        `- __User ID:__ \`${user.id}\`\n` +
                        `- __Status:__ \`User is not boosting any shared servers\``,
                        avatar
                    )
                )
                .addSeparatorComponents(sep());

            return message.reply(v2([c]));
        }

        const totalPages = boosts.length;
        let page = 0;

        const buildPage = (pIdx: number) => {
            const b = boosts[pIdx];
            const guildName = b.guildName || 'Unknown Server';
            const guildId = b.guildId || 'unknown';
            const guildIcon = b.guildIcon || avatar;
            const boostSinceTime = Math.floor(new Date(b.boostSince).getTime() / 1000);
            const memberCount = b.memberCount || 0;
            const boostCount = b.boostCount || 0;
            const tier = b.tier || 0;
            const ownerId = b.ownerId || null;

            const tierName = tier === 3 ? 'Level 3 (Max)' : (tier === 2 ? 'Level 2' : (tier === 1 ? 'Level 1' : 'No Tier'));
            const ownerMention = ownerId ? `<@${ownerId}>` : 'Unknown Owner';

            const container = new ContainerBuilder()
                .setAccentColor(EMBEDV2_COLOR)
                .addTextDisplayComponents(
                    text(
                        `# ${EMOJI_HEADER} __User Server Boosts Audit__\n` +
                        `> - **__Active Boost Allocations & Tier Levels__**`
                    )
                )
                .addSeparatorComponents(sep())
                .addSectionComponents(
                    headerSection(
                        `## ${guildName}\n` +
                        `- __Target User:__ <@${user.id}>\n` +
                        `- __Server ID:__ \`${guildId}\`\n` +
                        `- __Boosted Since:__ <t:${boostSinceTime}:D> (<t:${boostSinceTime}:R>)`,
                        guildIcon
                    )
                )
                .addSeparatorComponents(sep())
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `## ${EMOJI_BOOST} __Server Boost Details__\n` +
                        `- __Server Level:__ **\`${tierName}\`** (\`${boostCount}\` Boosts)\n` +
                        `- __Total Members:__ \`${Number(memberCount).toLocaleString()}\` members\n` +
                        `- __Server Owner:__ ${ownerMention}\n` +
                        `- __Total Boosted Servers:__ **\`${boosts.length}\`** server(s)`
                    )
                )
                .addSeparatorComponents(sep());

            if (totalPages > 1) {
                const prevBtn = new ButtonBuilder()
                    .setCustomId('sb_prev')
                    .setLabel('Previous')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji(EMOJI_LEFT)
                    .setDisabled(pIdx === 0);

                const countBtn = new ButtonBuilder()
                    .setCustomId('sb_count')
                    .setLabel(`${pIdx + 1} / ${totalPages}`)
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true);

                const nextBtn = new ButtonBuilder()
                    .setCustomId('sb_next')
                    .setLabel('Next')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji(EMOJI_RIGHT)
                    .setDisabled(pIdx === totalPages - 1);

                container.addActionRowComponents(new ActionRowBuilder<ButtonBuilder>().addComponents(prevBtn, countBtn, nextBtn));
                container.addSeparatorComponents(sep());
            }

            return container;
        };

        const responseMsg = await message.reply(v2([buildPage(page)]));
        if (totalPages <= 1 || !responseMsg) return;

        const collector = responseMsg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 180_000,
            filter: (i: any) => i.user.id === (message.author?.id || message.user?.id),
        });

        collector.on('collect', async (i: any) => {
            try { await i.deferUpdate(); } catch (_) { }
            if (i.customId === 'sb_prev') page = Math.max(0, page - 1);
            else if (i.customId === 'sb_next') page = Math.min(totalPages - 1, page + 1);
            else return;

            try {
                await responseMsg.edit(v2([buildPage(page)]));
            } catch (_) { }
        });
    }
};
