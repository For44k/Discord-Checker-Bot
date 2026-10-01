import { Message, AttachmentBuilder } from 'discord.js';
import { apiGet } from '../../services/api/apiService';
import { buildServerStatsCard, resolveIconUrl, loadServerIcon } from '../../services/canvas/myserverCanvas';
import { buildMyServerContainer, buildUnrankedServerContainer } from '../../utils/ui/tracking/myserverUI';
import { usageExampleReply, errorReply } from '../../utils/ui/usages';
import { buildLoadingReply } from '../../utils/ui/general/loadingUI';

let globalCommandCounter = 0;

export default {
    name: 'myserver',
    aliases: ['ms', 'serverstats'],
    description: 'Single-server Voice Stat Card — Ultra HD Cosmic Glass Showcase',

    async execute(message: Message | any, args: string[]) {
        const rawArg = args[0] ? args[0].replace(/[<@!#&>]/g, '').trim() : '';
        const targetId = rawArg || message.guild?.id;

        if (!targetId || !/^\d{15,25}$/.test(targetId)) {
            const usage = usageExampleReply({
                commandName: 'myserver',
                description: 'Generate Canvas for your server or a specified server ID',
                usage: '+myserver [serverId]',
                user: message.author
            });
            return message.reply(usage);
        }

        const waitMsg = await message.reply(buildLoadingReply('Rendering Cosmic Glass Showcase and server telemetry...')).catch(() => null);

        let data: any;
        try {
            data = await apiGet('/api/top-voice', 0, true);
        } catch (e: any) {
            const errPayload = errorReply({ errors: [`API Error: ${e.message}`] });
            return waitMsg ? waitMsg.edit(errPayload) : message.reply(errPayload);
        }

        if (!data || (!data.ready && data.ready !== undefined) || (!data.success && data.success !== undefined && !Array.isArray(data.data))) {
            const errPayload = errorReply({ errors: ['API voice tracking is currently initializing...'] });
            return waitMsg ? waitMsg.edit(errPayload) : message.reply(errPayload);
        }

        const allServers = Array.isArray(data) ? data : (data.data || []);
        const index = allServers.findIndex((s: any) => String(s.id || s.guildId) === String(targetId));

        if (index === -1) {
            let targetName = 'Unknown Server';

            if (message.guild && message.guild.id === targetId) {
                targetName = message.guild.name;
            } else if (message.client?.guilds) {
                const cached = message.client.guilds.cache.get(targetId);
                if (cached) {
                    targetName = cached.name;
                }
            }

            const unrankedPayload = buildUnrankedServerContainer(targetId, targetName);
            return waitMsg ? waitMsg.edit(unrankedPayload) : message.reply(unrankedPayload);
        }

        const server = allServers[index];
        const rank = index + 1;
        const totalServers = allServers.length;
        const totalVoice = allServers.reduce((acc: number, s: any) => acc + (s.score || s.voiceCount || 0), 0);
        const maxScore = allServers.reduce((m: number, s: any) => Math.max(m, s.score || s.voiceCount || 0), 0);

        let sAvatar = resolveIconUrl(server.id || targetId, server.avatar || server.icon || server.guildIcon);
        let sName = server.name || server.tag || server.guildName;
        let sMembers = server.membersCount || server.memberCount;

        if (message.client?.guilds) {
            const cached = message.client.guilds.cache.get(server.id || targetId);
            if (cached) {
                if (!sName || sName === 'Unknown Server') sName = cached.name;
                sAvatar = cached.iconURL({ size: 128, extension: 'png' }) || sAvatar;
                if (!sMembers) sMembers = cached.memberCount;
            }
        }

        const serverObj = {
            ...server,
            id: server.id || targetId,
            name: sName || `Server ${targetId.slice(-6)}`,
            membersCount: sMembers || 0,
            score: server.score || server.voiceCount || 0
        };

        const iconImg = await loadServerIcon(sAvatar);
        const { buffer, palette } = buildServerStatsCard(
            serverObj,
            rank,
            totalServers,
            totalVoice,
            maxScore,
            iconImg,
            globalCommandCounter++
        );

        const fileName = `myserver-${serverObj.id}.png`;
        const file = new AttachmentBuilder(buffer, { name: fileName });

        const payload = buildMyServerContainer(
            serverObj,
            rank,
            totalServers,
            totalVoice,
            fileName,
            sAvatar || undefined,
            palette.hexInt
        );
        return waitMsg ? waitMsg.edit({ ...payload, files: [file] }) : message.reply({ ...payload, files: [file] });
    }
};
