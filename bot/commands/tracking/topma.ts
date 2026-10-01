import { Message, AttachmentBuilder } from 'discord.js';
import { loadImage, Image } from '@napi-rs/canvas';
import { apiGet } from '../../services/api/apiService';
import { buildPNGPageFrame, resolveIconUrl } from '../../services/canvas/topmaCanvas';
import { buildTopmaContainer } from '../../utils/ui/tracking/topmaUI';
import { errorReply } from '../../utils/ui/usages';
import { buildLoadingReply } from '../../utils/ui/general/loadingUI';
import { FastCache } from '../../cache/fastCache';

let globalCommandCounter = 0;
const iconMemoryCache = new FastCache<Image>(300000, 200);
const iconLoadCache = new FastCache<Promise<Image | null>>(60000, 200);
const renderedPageCache = new FastCache<Buffer>(120000, 50);
let leaderboardCache: { expiresAt: number; data: any } | null = null;
export const topmaSessionCache = new FastCache<any>(600000, 200);

async function loadImgWithTimeout(url: string, timeoutMs: number = 900): Promise<Image | null> {
    return Promise.race([
        loadImage(url).catch(() => null),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs))
    ]);
}

export async function renderTopmaPage(
    allServers: any[],
    page: number,
    totalPages: number,
    totalVoice: number,
    client: any,
    bgIndex?: number
): Promise<any> {
    const start = (page - 1) * 10;
    const rawPageServers = allServers.slice(start, start + 10);
    const renderKey = `${bgIndex ?? 0}:${page}:${rawPageServers.map(server => `${server.id || server.guildId}:${server.score || server.voiceCount || 0}`).join(',')}`;
    const cachedBuffer = renderedPageCache.get(renderKey);
    if (cachedBuffer) {
        const fileName = `topma-page-${page}.png`;
        const file = new AttachmentBuilder(cachedBuffer, { name: fileName });
        const payload = buildTopmaContainer(allServers, page, totalPages, totalVoice, fileName);
        return {
            ...payload,
            files: [file]
        };
    }
    const iconMap = new Map<string, Image>();

    const pageServers = await Promise.all(rawPageServers.map(async (s: any) => {
        const guildId = s.id || s.guildId || s.guild?.id;
        let sName = s.name || s.guildName || s.tag || s.guild?.name;
        let sAvatar = s.avatar || s.guildIcon || s.icon || s.guild?.icon;
        let sMembers = s.membersCount || s.memberCount || s.guild?.memberCount;

        sAvatar = resolveIconUrl(guildId, sAvatar);

        if (guildId && client?.guilds) {
            const cachedGuild = client.guilds.cache.get(guildId);
            if (cachedGuild) {
                if (!sName || sName === 'Unknown Server') sName = cachedGuild.name;
                sAvatar = cachedGuild.iconURL({ size: 128, extension: 'png' }) || sAvatar;
                if (!sMembers) sMembers = cachedGuild.memberCount;
            }
        }

        if (guildId && iconMemoryCache.has(guildId)) {
            iconMap.set(guildId, iconMemoryCache.get(guildId)!);
        } else if (sAvatar) {
            let imagePromise = iconLoadCache.get(sAvatar);
            if (!imagePromise) {
                imagePromise = loadImgWithTimeout(sAvatar);
                iconLoadCache.set(sAvatar, imagePromise);
            }
            const img = await imagePromise;
            if (img && guildId) {
                iconMemoryCache.set(guildId, img);
                iconMap.set(guildId, img);
            }
        }

        return {
            ...s,
            id: guildId || 'N/A',
            name: sName || `Server ${guildId ? guildId.slice(-6) : ''}`.trim(),
            avatar: sAvatar,
            membersCount: sMembers || 0,
        };
    }));

    const buffer = buildPNGPageFrame(pageServers, page, totalPages, totalVoice, iconMap, bgIndex);
    renderedPageCache.set(renderKey, buffer);
    const fileName = `topma-page-${page}.png`;
    const file = new AttachmentBuilder(buffer, { name: fileName });
    const payload = buildTopmaContainer(allServers, page, totalPages, totalVoice, fileName);

    return {
        ...payload,
        files: [file]
    };
}

export default {
    name: 'topma',
    aliases: ['tma', 'topvoice', 'tv', 'topmaroc'],
    description: 'Voice Leaderboard — Ultra HD Cosmic Glass Showcase',

    async execute(message: Message | any) {
        const waitMsg = await message.reply(buildLoadingReply('Gathering voice telemetry and generating leaderboard...')).catch(() => null);

        let data: any;
        try {
            if (leaderboardCache && leaderboardCache.expiresAt > Date.now()) {
                data = leaderboardCache.data;
            } else {
                data = await apiGet('/api/top-voice', 0, true);
                leaderboardCache = { expiresAt: Date.now() + 5000, data };
            }
        } catch (e: any) {
            const errPayload = errorReply({ errors: [`API Error: ${e.message}`] });
            return waitMsg ? waitMsg.edit(errPayload) : message.reply(errPayload);
        }

        if (!data || (!data.ready && data.ready !== undefined) || (!data.success && data.success !== undefined && !Array.isArray(data.data))) {
            const errPayload = errorReply({ errors: ['API is initializing top voice data...'] });
            return waitMsg ? waitMsg.edit(errPayload) : message.reply(errPayload);
        }

        const allServers = Array.isArray(data) ? data : (data.data || []);
        if (!allServers.length) {
            const errPayload = errorReply({ errors: ['No voice activity reported right now.'] });
            return waitMsg ? waitMsg.edit(errPayload) : message.reply(errPayload);
        }

        const totalVoice = allServers.reduce((acc: number, s: any) => acc + (s.score || s.voiceCount || 0), 0);
        const totalPages = Math.ceil(allServers.length / 10);
        const page = 1;
        const bgIndex = globalCommandCounter++;

        const result = await renderTopmaPage(allServers, page, totalPages, totalVoice, message.client, bgIndex);
        const replyMsg = waitMsg ? await waitMsg.edit(result) : await message.reply(result);
        if (replyMsg) {
            const sessionData = { allServers, currentPage: page, totalPages, totalVoice, bgIndex };
            topmaSessionCache.set(replyMsg.id, sessionData);
            topmaSessionCache.set(message.author?.id || message.user?.id, sessionData);
        }

        return replyMsg;
    }
};
