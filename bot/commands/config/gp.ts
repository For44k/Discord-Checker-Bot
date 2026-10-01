import { PermissionsBitField, Routes } from 'discord.js';
import { buildGpUsagePayload, buildGpSuccessPayload, buildGpErrorPayload } from '../../utils/ui/config/gpUI';

export default {
    name: 'gp',
    aliases: ['guildprofile', 'botprofile', 'setavatar', 'botavatar'],
    description: 'View or change the bot guild profile (avatar, banner, nickname, bio)',
    cooldown: 5,

    async execute(message: any, args: string[], client: any) {
        if (!message.guild) return;

        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply(buildGpErrorPayload(
                'Permission Denied',
                'You need **Administrator** permission to modify the bot profile in this server.',
                '+gp'
            ));
        }

        const sub = args[0]?.toLowerCase();
        if (!sub || sub === 'show' || sub === 'help') {
            return message.reply(buildGpUsagePayload('+'));
        }

        return handleUpdate(message, args, sub, client);
    }
};

async function urlToDataURI(url: string): Promise<string> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Could not download the image (HTTP ${res.status}).`);

    const contentType = res.headers.get('content-type') ?? '';
    if (!/^image\/(png|jpeg|jpg|gif|webp)/i.test(contentType)) {
        throw new Error('The provided file is not a valid image format (PNG, JPG, GIF, or WebP).');
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.byteLength > 10 * 1024 * 1024) {
        throw new Error('Image size is too large (10MB maximum allowed).');
    }

    return `data:${contentType};base64,${buffer.toString('base64')}`;
}

async function resolveImageSource(message: any, args: string[]): Promise<string | null> {

    const attachment = message.attachments?.first?.();
    if (attachment?.url) return attachment.url;


    if (message.reference?.messageId) {
        try {
            const refMsg = await message.channel.messages.fetch(message.reference.messageId);
            const refAttachment = refMsg?.attachments?.first?.();
            if (refAttachment?.url) return refAttachment.url;
        } catch {}
    }


    for (let i = 1; i < args.length; i++) {
        if (/^https?:\/\//i.test(args[i])) {
            return args[i];
        }
    }

    return args[1] ?? null;
}

async function handleUpdate(message: any, args: string[], sub: string, client: any) {
    const body: Record<string, string | null> = {};
    let fieldLabel = '';
    let detail = '';
    let previewUrl: string | null = null;

    try {
        switch (sub) {
            case 'name':
            case 'nick':
            case 'nickname': {
                const name = args.slice(1).join(' ').trim();
                if (!name) {
                    return message.reply(buildGpErrorPayload(
                        'Missing Nickname',
                        'Please specify a new nickname for the bot.',
                        '+gp name <nickname>'
                    ));
                }
                if (name.length > 32) {
                    return message.reply(buildGpErrorPayload(
                        'Nickname Too Long',
                        'Nickname must be 32 characters or fewer.',
                        '+gp name <nickname>'
                    ));
                }
                body.nick = name;
                fieldLabel = 'Bot Nickname';
                detail = `Nickname updated to **\`${name}\`**.`;
                break;
            }
            case 'bio':
            case 'about': {
                const bio = args.slice(1).join(' ').trim();
                if (!bio) {
                    return message.reply(buildGpErrorPayload(
                        'Missing Bio',
                        'Please specify a bio description for the bot.',
                        '+gp bio <custom bio>'
                    ));
                }
                if (bio.length > 190) {
                    return message.reply(buildGpErrorPayload(
                        'Bio Too Long',
                        'Bio must be 190 characters or fewer.',
                        '+gp bio <custom bio>'
                    ));
                }
                body.bio = bio;
                fieldLabel = 'Server Bio';
                detail = `Server bio updated to:\n> *${bio}*`;
                break;
            }
            case 'avatar':
            case 'av':
            case 'icon':
            case 'pic': {
                const source = await resolveImageSource(message, args);
                if (!source) {
                    return message.reply(buildGpErrorPayload(
                        'Missing Avatar Image',
                        'Please attach an image or provide a valid image URL.',
                        '+gp avatar <url or attach image>'
                    ));
                }
                body.avatar = await urlToDataURI(source);
                fieldLabel = 'Bot Avatar';
                detail = 'Updated server bot avatar.';
                previewUrl = source;
                break;
            }
            case 'banner': {
                const source = await resolveImageSource(message, args);
                if (!source) {
                    return message.reply(buildGpErrorPayload(
                        'Missing Banner Image',
                        'Please attach an image or provide a valid image URL.',
                        '+gp banner <url or attach image>'
                    ));
                }
                body.banner = await urlToDataURI(source);
                fieldLabel = 'Bot Banner';
                detail = 'Updated server bot banner.';
                previewUrl = source;
                break;
            }
            case 'reset': {
                body.nick = null;
                body.avatar = null;
                body.banner = null;
                body.bio = null;
                fieldLabel = 'Profile Reset';
                detail = 'Restored default bot avatar, nickname, and server settings.';
                break;
            }
            default:
                return message.reply(buildGpErrorPayload(
                    'Invalid Subcommand',
                    `Unknown option \`${sub}\`.`,
                    '+gp avatar | banner | name | bio | reset'
                ));
        }

        await client.rest.patch(Routes.guildMember(message.guild.id, '@me'), {
            body,
            reason: `Guild profile updated by ${message.author.tag} (${message.author.id})`,
        });

        return message.reply(buildGpSuccessPayload(fieldLabel, detail, previewUrl));
    } catch (err: any) {
        console.error('[gp] Guild profile update error:', err);
        const apiMsg = err?.rawError?.message || err?.message || 'Discord rejected the request.';
        return message.reply(buildGpErrorPayload(
            'Update Failed',
            apiMsg,
            '+gp avatar | banner | name | bio | reset'
        ));
    }
}
