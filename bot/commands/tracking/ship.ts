import { Message, AttachmentBuilder } from 'discord.js';
import { loadImage, Image } from '@napi-rs/canvas';
import { resolveUser } from '../../services/userResolver';
import { apiGet } from '../../services/api/apiService';
import { buildShipCanvas, ShipData } from '../../services/canvas/shipCanvas';
import { usageExampleReply, errorReply } from '../../utils/ui/usages';

export default {
    name: 'ship',
    aliases: ['love', 'match', 'chemistry', 'pair'],
    description: 'Calculate social compatibility, shared servers, and voice overlap between two users',
    usage: '+ship <@user/id> [@user2/id]',
    examples: ['+ship @user', '+ship @user1 @user2', '+ship 1459194956517216510 1287172309785776278'],

    async execute(message: Message | any, args: string[]) {
        if (!args || args.length === 0) {
            return message.reply(usageExampleReply({
                commandName: 'ship',
                description: 'Calculate social compatibility, shared servers, and voice overlap between two users',
                usage: '+ship @mention | ID | username',
                user: message.author || message.user
            }));
        }

        let user1: any = null;
        let user2: any = null;

        if (args.length >= 2) {
            user1 = await resolveUser(message, [args[0]]);
            user2 = await resolveUser(message, [args[1]]);
        } else {
            user1 = message.author || message.user;
            user2 = await resolveUser(message, [args[0]]);
        }

        if (!user1 || !user2) {
            return message.reply(errorReply({
                title: 'User Resolution Failed',
                errors: [
                    'Could not resolve one or both of the specified users.',
                    'Please make sure you provide a valid mention or user ID.'
                ]
            }));
        }

        if (user1.id === user2.id) {
            return message.reply(errorReply({
                title: 'Self-Ship Not Allowed',
                errors: ['You cannot ship someone with themselves! Choose two different users.']
            }));
        }

        let rawData: any = null;
        try {
            const apiRes: any = await apiGet(`/api/social-ship?user1Id=${user1.id}&user2Id=${user2.id}`, 0, false);
            if (apiRes && (apiRes.success || apiRes.compatibility !== undefined || apiRes.data)) {
                rawData = apiRes.data || apiRes;
            }
        } catch (_) {
            try {
                const fallbackRes: any = await apiGet(`/api/social-ship?user1=${user1.id}&user2=${user2.id}`, 0, false);
                if (fallbackRes && (fallbackRes.success || fallbackRes.compatibility !== undefined || fallbackRes.data)) {
                    rawData = fallbackRes.data || fallbackRes;
                }
            } catch (_) {}
        }

        if (!rawData) {
            const hash = Math.abs((parseInt(user1.id.slice(-4), 10) || 1) ^ (parseInt(user2.id.slice(-4), 10) || 1));
            const compat = 40 + (hash % 55);
            rawData = {
                user1: { id: user1.id, username: user1.username, displayName: user1.displayName || user1.username, avatar: user1.displayAvatarURL({ size: 512, extension: 'png' }) },
                user2: { id: user2.id, username: user2.username, displayName: user2.displayName || user2.username, avatar: user2.displayAvatarURL({ size: 512, extension: 'png' }) },
                compatibility: compat,
                title: compat > 80 ? 'Destined Soulmates' : (compat > 60 ? 'Close Friends' : 'Good Acquaintances'),
                sharedDurationSeconds: 0,
                sharedDurationHours: 0,
                sharedGuildsCount: 0,
                mutualGuilds: []
            };
        }

        const durationSecs = rawData.sharedDurationSeconds || (rawData.sharedDurationHours ? Math.round(rawData.sharedDurationHours * 3600) : 0);
        const hours = Math.floor(durationSecs / 3600);
        const mins = Math.floor((durationSecs % 3600) / 60);
        const formattedTime = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

        const shipData: ShipData = {
            compatibility: rawData.compatibility ?? (rawData.shipPercentage ?? 50),
            statusTitle: rawData.title || (rawData.comment || 'Casual Friends'),
            statusPhrase: (rawData.compatibility ?? 50) >= 80 ? 'An unbreakable cosmic bond.' : ((rawData.compatibility ?? 50) >= 50 ? 'Great vibes together.' : 'Still discovering each other.'),
            sharedTimeFormatted: formattedTime,
            totalSharedSeconds: durationSecs,
            mutualServersCount: rawData.sharedGuildsCount ?? rawData.mutualGuilds?.length ?? (rawData.commonGuilds?.length ?? 0),
            inSameVoice: Boolean(rawData.inSameVoice),
            user1: {
                id: user1.id,
                username: user1.username,
                globalName: user1.displayName || user1.username,
                avatar: user1.displayAvatarURL({ extension: 'png', size: 512 }),
                inVoice: Boolean(rawData.user1?.inVoice)
            },
            user2: {
                id: user2.id,
                username: user2.username,
                globalName: user2.displayName || user2.username,
                avatar: user2.displayAvatarURL({ extension: 'png', size: 512 }),
                inVoice: Boolean(rawData.user2?.inVoice)
            }
        };

        let u1AvatarImg: Image | null = null;
        let u2AvatarImg: Image | null = null;

        if (shipData.user1.avatar) {
            try { u1AvatarImg = await loadImage(shipData.user1.avatar); } catch {}
        }
        if (shipData.user2.avatar) {
            try { u2AvatarImg = await loadImage(shipData.user2.avatar); } catch {}
        }

        const buffer = buildShipCanvas(shipData, u1AvatarImg, u2AvatarImg);
        const file = new AttachmentBuilder(buffer, { name: `ship-${user1.id}-${user2.id}.png` });

        return message.reply({
            files: [file],
            allowedMentions: { users: [] }
        });
    }
};
