import { Message } from 'discord.js';
import { apiGet } from '../../services/api/apiService';
import { buildServerInfoError, buildServerInfoPage } from '../../utils/ui/info/serverinfoUI';
import { usageExampleReply } from '../../utils/ui/usages';

export default {
    name: 'serverinfo',
    description: 'Get detailed information about a server',
    aliases: ['si'],

    async execute(message: Message, args: string[]) {
        const rawArg = args[0] ? args[0].replace(/[<@!&#>]/g, '').trim() : '';
        const guildId = rawArg || message.guild?.id;
        if (!guildId || !/^\d{17,20}$/.test(guildId)) {
            const usage = usageExampleReply({
                commandName: 'serverinfo',
                description: 'Get comprehensive server analytics and roles details',
                usage: '+si [ID | @server]',
                user: message.author
            });
            return message.reply(usage);
        }

        let data: any;
        try {
            data = await apiGet(`/api/server-info/${guildId}`, 0, false);
        } catch {
            return message.reply(buildServerInfoError());
        }

        if (!data || !data.success || !data.data) {
            return message.reply(buildServerInfoError());
        }

        const serverData = { ...data.data };

        if (message.client) {
            const clientGuild = message.client.guilds.cache.get(guildId);
            if (clientGuild) {
                if (!serverData.name) serverData.name = clientGuild.name;
                if (!serverData.icon) serverData.icon = clientGuild.iconURL({ size: 512 });
                if (!serverData.banner) serverData.banner = clientGuild.bannerURL({ size: 1024 });
                if (!serverData.ownerId) serverData.ownerId = clientGuild.ownerId;
                if (!serverData.memberCount) serverData.memberCount = clientGuild.memberCount;
            }

            if (serverData.ownerId) {
                const ownerUser = message.client.users.cache.get(serverData.ownerId);
                if (ownerUser) {
                    if (!serverData.ownerAvatar) serverData.ownerAvatar = ownerUser.displayAvatarURL({ size: 512 });
                    if (!serverData.ownerCreatedAt) serverData.ownerCreatedAt = ownerUser.createdAt;
                }
                const ownerMember = clientGuild?.members.cache.get(serverData.ownerId);
                if (ownerMember) {
                    if (ownerMember.premiumSince && !serverData.ownerBoostingServer) {
                        serverData.ownerBoostingServer = true;
                    }
                    if (ownerMember.presence && ownerMember.presence.status !== 'offline') {
                        serverData.ownerOnlineStatus = ownerMember.presence.status;
                        serverData.ownerLastOnline = new Date();
                    }
                }
            }
        }

        return message.reply(buildServerInfoPage(serverData, message));
    }
};
