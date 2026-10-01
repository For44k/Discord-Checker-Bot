import { Message, AttachmentBuilder } from 'discord.js';
import { loadImage, Image } from '@napi-rs/canvas';
import { resolveUser } from '../../services/userResolver';
import { apiGet } from '../../services/api/apiService';
import { buildUserVoiceCanvas } from '../../services/canvas/userVoiceCanvas';
import { usageExampleReply, errorReply } from '../../utils/ui/usages';

export default {
    name: 'uservoice',
    aliases: ['uv', 'voiceinfo', 'vi', 'uinfo'],
    description: 'User Voice & Chat Analytics — Ultra HD Frosted Glass Identity Card',
    usage: '+uv <@user/id>',
    examples: ['+uv @user', '+uv 1459194956517216510'],

    async execute(message: Message | any, args: string[]) {
        if (!args || args.length === 0) {
            return message.reply(usageExampleReply({
                commandName: 'uservoice',
                description: 'Displays deep voice analytics, active room info, and top companions.',
                usage: '+uv <@user/id>',
                example: '+uv @user\n+uv 1459194956517216510',
                user: message.author || message.user
            }));
        }

        const user = await resolveUser(message, args);
        if (!user) {
            return message.reply(errorReply({
                title: 'User Not Found',
                errors: [
                    'Could not find that user. Please provide a valid user mention or ID.',
                    'Example: `+uv @user` or `+uv 1459194956517216510`'
                ]
            }));
        }

        const targetId = user.id;

        const [apiRes, presRes] = await Promise.allSettled([
            apiGet<any>(`/api/user-deep-analytics/${targetId}`, 0, true),
            apiGet<any>(`/api/user-presence/${targetId}`, 0, false),
        ]);

        const raw = apiRes.status === 'fulfilled' && apiRes.value?.success
            ? (apiRes.value.data || apiRes.value)
            : null;

        const userPresenceData = presRes.status === 'fulfilled' && presRes.value?.success
            ? (presRes.value.data || presRes.value)
            : null;

        const avatarUrl = user.displayAvatarURL({ extension: 'png', size: 512 });

        const userData = {
            userId: targetId,
            username: raw?.username || user.username,
            globalName: raw?.globalName || user.globalName || user.displayName || user.username,
            avatar: avatarUrl,
            status: userPresenceData?.status || (raw?.inVoice ? 'online' : 'offline'),
            inVoice: Boolean(raw?.inVoice),
            topVoiceServers: raw?.topVoiceServers || [],
            topVoiceCompanions: raw?.topVoiceCompanions || [],
            topMessageServers: raw?.topMessageServers || [],
        };

        const allServers = [...(userData.topVoiceServers || []), ...(userData.topMessageServers || [])];
        const uniqueCompanions = Array.isArray(userData.topVoiceCompanions) ? userData.topVoiceCompanions.filter(c => c.avatar) : [];

        const [userAvatarImg, ...restImages] = await Promise.all([
            loadImage(avatarUrl).catch(() => null) as Promise<Image | null>,
            ...uniqueCompanions.map(c => loadImage(c.avatar).catch(() => null) as Promise<Image | null>),
            ...allServers.filter((s, i, arr) => s?.id && s?.icon && arr.findIndex(x => x.id === s.id) === i).map(s => loadImage(s.icon).catch(() => null) as Promise<Image | null>),
        ]);

        const companionImages = new Map<string, Image>();
        const serverIcons = new Map<string, Image>();

        let restIdx = 0;
        for (const comp of uniqueCompanions) {
            const img = restImages[restIdx++];
            if (img) companionImages.set(comp.id, img);
        }

        const uniqueServers = allServers.filter((s, i, arr) => s?.id && s?.icon && arr.findIndex(x => x.id === s.id) === i);
        for (const srv of uniqueServers) {
            const img = restImages[restIdx++];
            if (img) serverIcons.set(srv.id, img);
        }

        const buffer = buildUserVoiceCanvas(userData, userAvatarImg, companionImages, serverIcons);
        const file = new AttachmentBuilder(buffer, { name: `uservoice-${targetId}.png` });

        return message.reply({
            files: [file],
            allowedMentions: { users: [] }
        });
    }
};
