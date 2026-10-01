import {
    Message,
    ChannelType,
    ChannelSelectMenuBuilder,
    ActionRowBuilder,
    ContainerBuilder,
    PermissionsBitField
} from 'discord.js';
import { joinVoiceChannel } from '@discordjs/voice';
import { VoiceLockStore } from '../../database/services/voiceLockStore';
import { PermissionService } from '../../database/services/permissionStore';
import { sep, text, v2 } from '../../utils/ui/components';

const EMBEDV2_COLOR = 0xBBEDFF;

export function connectToVoice(guild: any, channelId: string) {
    try {
        return joinVoiceChannel({
            channelId,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
            selfDeaf: false,
            selfMute: false
        });
    } catch (e) {
        console.error(`[VoiceLock] Failed to join voice channel ${channelId}:`, e);
        return null;
    }
}

export function buildJoinSuccessReply(channelId: string): object {
    const c = new ContainerBuilder()
        .setAccentColor(EMBEDV2_COLOR)
        .addTextDisplayComponents(text('# <a:miaw:1543607484390969404>  Success'))
        .addSeparatorComponents(sep())
        .addTextDisplayComponents(text(`Successfully Joined <#${channelId}>`))
        .addSeparatorComponents(sep());
    return v2([c]);
}

export default {
    name: 'join',
    description: 'Lock the bot into a voice channel 24/7 permanently',
    aliases: ['lockvoice', 'voicelock', 'vcjoin'],

    async execute(message: Message | any, args: string[]) {
        const guild = message.guild;
        if (!guild) return message.reply('This command must be used in a server.');

        const isOwner = guild.ownerId === (message.author?.id || message.user?.id);
        const isAdmin = message.member?.permissions?.has(PermissionsBitField.Flags.Administrator);
        const allowedRoles = PermissionService.getRoles(guild.id);
        const allowedUsers = PermissionService.getUsers(guild.id);
        const hasAllowedRole = allowedRoles.length > 0 && message.member?.roles?.cache?.hasAny(...allowedRoles);
        const hasAllowedUser = allowedUsers.includes(message.author?.id || message.user?.id);

        if (!isOwner && !isAdmin && !hasAllowedRole && !hasAllowedUser) {
            const errC = new ContainerBuilder()
                .setAccentColor(0xED4245)
                .addTextDisplayComponents(text("## Permission Denied\nYou need Administrator permission or an authorized role/user to lock voice channels."));
            return message.reply(v2([errC]));
        }

        if (args && args[0]) {
            const rawId = args[0].replace(/[<#>]/g, '').trim();
            const targetChannel = guild.channels.cache.get(rawId);
            if (targetChannel && (targetChannel.type === ChannelType.GuildVoice || targetChannel.type === ChannelType.GuildStageVoice)) {
                connectToVoice(guild, targetChannel.id);
                VoiceLockStore.setChannel(guild.id, targetChannel.id);
                return message.reply(buildJoinSuccessReply(targetChannel.id));
            }
        }

        const channelSelect = new ChannelSelectMenuBuilder()
            .setCustomId('join_voice_select')
            .setPlaceholder('Select a voice channel to join...')
            .setChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice);

        const row = new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(channelSelect);

        const promptContainer = new ContainerBuilder()
            .setAccentColor(EMBEDV2_COLOR)
            .addTextDisplayComponents(text('# <a:miaw:1543607484390969404>  Select Voice Channel'))
            .addSeparatorComponents(sep())
            .addTextDisplayComponents(text('Please select a voice channel below for 24/7 permanent connection:'))
            .addSeparatorComponents(sep())
            .addActionRowComponents(row)
            .addSeparatorComponents(sep());

        const replyMsg = await message.reply(v2([promptContainer]));
        if (!replyMsg) return;

        const collector = replyMsg.createMessageComponentCollector({
            time: 60000,
            filter: (i: any) => i.user.id === (message.author?.id || message.user?.id)
        });

        collector.on('collect', async (interaction: any) => {
            const channelId = interaction.values?.[0];
            if (!channelId) return;

            connectToVoice(guild, channelId);
            VoiceLockStore.setChannel(guild.id, channelId);

            await interaction.update(buildJoinSuccessReply(channelId)).catch(async () => {
                await replyMsg.edit(buildJoinSuccessReply(channelId)).catch(() => {});
            });
            collector.stop();
        });
    }
};
