import { ButtonInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle, ContainerBuilder } from 'discord.js';
import { EMBEDV2_COLOR, sep, text, v2 } from '../../../utils/ui/components';

export default {
    id: 'cv_join',
    async execute(interaction: ButtonInteraction): Promise<void> {
        const parts = interaction.customId.split(':');
        const guildId = parts[1];
        const channelId = parts[2];

        if (!guildId || !channelId) {
            await interaction.reply({
                content: 'Invalid voice channel parameters.',
                ephemeral: true
            }).catch(() => {});
            return;
        }

        const voiceUrl = `https://discord.com/channels/${guildId}/${channelId}`;
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setLabel('Join Voice Channel')
                .setURL(voiceUrl)
                .setStyle(ButtonStyle.Link)
                .setEmoji('<:click:1550850301010116648>')
        );

        const container = new ContainerBuilder()
            .setAccentColor(EMBEDV2_COLOR)
            .addTextDisplayComponents(text(`# 🔊 __Join Voice Channel__`))
            .addSeparatorComponents(sep())
            .addTextDisplayComponents(text(`> Click the button below to join <#${channelId}> in Discord.`))
            .addSeparatorComponents(sep())
            .addActionRowComponents(row)
            .addSeparatorComponents(sep());

        await interaction.reply({
            ...v2([container]),
            ephemeral: true
        }).catch(() => {});
    }
};
