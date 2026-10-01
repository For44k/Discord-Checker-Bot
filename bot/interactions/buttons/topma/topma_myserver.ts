import { ButtonInteraction, AttachmentBuilder } from 'discord.js';
import { apiGet } from '../../../services/api/apiService';
import { buildServerStatsCard, resolveIconUrl, loadServerIcon } from '../../../services/canvas/myserverCanvas';
import { buildMyServerContainer, buildUnrankedServerContainer } from '../../../utils/ui/tracking/myserverUI';

let counter = 0;

export default {
    id: 'topma_myserver',
    async execute(interaction: ButtonInteraction) {
        const guildId = interaction.guildId;
        if (!guildId) {
            return interaction.reply({
                content: 'Please click this button inside a Discord server to view its rank.',
                ephemeral: true
            }).catch(() => {});
        }

        await interaction.deferReply({ ephemeral: true }).catch(() => {});

        let data: any;
        try {
            data = await apiGet('/api/top-voice', 0, true);
        } catch {
            return interaction.editReply({
                content: 'Failed to fetch real-time voice leaderboard data.'
            }).catch(() => {});
        }

        const allServers = Array.isArray(data) ? data : (data?.data || []);
        const index = allServers.findIndex((s: any) => String(s.id || s.guildId) === String(guildId));

        if (index === -1) {
            const targetName = interaction.guild?.name || 'This Server';
            const payload = buildUnrankedServerContainer(guildId, targetName);
            return interaction.editReply(payload).catch(() => {});
        }

        const server = allServers[index];
        const rank = index + 1;
        const totalServers = allServers.length;
        const totalVoice = allServers.reduce((acc: number, s: any) => acc + (s.score || s.voiceCount || 0), 0);
        const maxScore = allServers.reduce((m: number, s: any) => Math.max(m, s.score || s.voiceCount || 0), 0);

        let sAvatar = resolveIconUrl(server.id || guildId, server.avatar || server.icon || server.guildIcon);
        let sName = server.name || server.tag || server.guildName || interaction.guild?.name;
        let sMembers = server.membersCount || server.memberCount || interaction.guild?.memberCount;

        if (interaction.guild) {
            sAvatar = interaction.guild.iconURL({ size: 128, extension: 'png' }) || sAvatar;
            if (!sMembers) sMembers = interaction.guild.memberCount;
        }

        const serverObj = {
            ...server,
            id: guildId,
            name: sName || `Server ${guildId.slice(-6)}`,
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
            counter++
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

        return interaction.editReply({ ...payload, files: [file] }).catch(() => {});
    }
};
