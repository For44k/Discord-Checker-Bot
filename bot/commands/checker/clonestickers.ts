import { Message, AttachmentBuilder, PermissionFlagsBits } from 'discord.js';
import AdmZip from 'adm-zip';
import { apiGet } from '../../services/api/apiService';
import { usageExampleReply, errorReply } from '../../utils/ui/usages';
import { buildLoadingReply } from '../../utils/ui/general/loadingUI';
import { buildCloneSuccessPayload, buildCloneSizeExceededPayload } from '../../utils/ui/checker/cloneUI';

const MAX_DISCORD_UPLOAD_BYTES = 500 * 1024 * 1024;

export default {
    name: 'clonestickers',
    description: 'Download all custom stickers from a server into a zip file',
    aliases: ['stickerszip', 'downloadstickers', 'clonesticker', 'stickerzip'],
    cooldown: 180,

    async execute(message: Message, args: string[]) {
        if (message.guild && !message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply(errorReply({
                title: 'Permission Denied',
                errors: ['You must have Administrator permission to use this command.'],
                user: message.author
            }));
        }

        const rawArg = args[0] ? args[0].replace(/[<@!&#>]/g, '').trim() : '';
        const serverId = rawArg || message.guild?.id;

        if (!serverId || !/^\d{15,25}$/.test(serverId)) {
            return message.reply(usageExampleReply({
                commandName: 'clonestickers',
                description: 'Export all server custom stickers into a zip file',
                usage: '+clonestickers <serverId>',
                example: '+clonestickers 899768606789877810'
            }));
        }

        const waitMsg = await message.reply(buildLoadingReply('Downloading and archiving custom stickers...')).catch(() => null);

        let data: any;
        try {
            data = await apiGet(`/api/server-stickers/${serverId}`);
        } catch (e: any) {
            const notFound = errorReply({
                title: 'Fetching Failed',
                errors: [`API Error: ${e.message}`]
            });
            return waitMsg ? waitMsg.edit(notFound) : message.reply(notFound);
        }

        const stickers = Array.isArray(data?.stickers) ? data.stickers : (Array.isArray(data?.data) ? data.data : []);
        if (!data || !data.success || !stickers || stickers.length === 0) {
            const notFound = errorReply({
                title: 'Fetching Failed',
                errors: [`Could not find any stickers for server \`${serverId}\`.`]
            });
            return waitMsg ? waitMsg.edit(notFound) : message.reply(notFound);
        }

        try {
            const zip = new AdmZip();
            let count = 0;

            await Promise.allSettled(stickers.map(async (stk: any) => {
                try {
                    let ext = 'png';
                    if (stk.format_type === 3 || stk.formatType === 3) {
                        ext = 'json';
                    } else if (stk.format_type === 4 || stk.formatType === 4) {
                        ext = 'gif';
                    }

                    const url = stk.url || `https://media.discordapp.net/stickers/${stk.id}.${ext === 'json' ? 'json' : 'png'}`;
                    const res = await fetch(url);
                    if (res.ok) {
                        const buffer = Buffer.from(await res.arrayBuffer());
                        const safeName = (stk.name || 'sticker').replace(/[/\\?%*:|"<>]/g, '_');
                        zip.addFile(`${safeName}_${stk.id}.${ext}`, buffer);
                        count++;
                    }
                } catch { }
            }));

            if (count === 0) {
                const errPayload = errorReply({
                    title: 'Export Failed',
                    errors: ['Failed to download any stickers from the server.']
                });
                return waitMsg ? waitMsg.edit(errPayload) : message.reply(errPayload);
            }

            const zipBuffer = zip.toBuffer();

            if (zipBuffer.length > MAX_DISCORD_UPLOAD_BYTES) {
                const limitPayload = buildCloneSizeExceededPayload({
                    assetType: 'Custom Stickers',
                    serverId,
                    count,
                    sizeBytes: zipBuffer.length,
                    maxLimitMB: 500
                });
                return waitMsg ? waitMsg.edit(limitPayload) : message.reply(limitPayload);
            }

            const fileName = `server_stickers_${serverId}.zip`;
            const attachment = new AttachmentBuilder(zipBuffer, { name: fileName });
            const successPayload = buildCloneSuccessPayload({
                title: 'Server Stickers Cloned',
                assetType: 'Custom Stickers',
                serverId,
                count,
                sizeBytes: zipBuffer.length,
                fileName
            });

            if (waitMsg) {
                await waitMsg.delete().catch(() => {});
            }
            return message.reply({ ...successPayload, files: [attachment] });
        } catch (err: any) {
            const errPayload = errorReply({
                title: 'Archive Creation Failed',
                errors: [`Zip error: ${err.message}`]
            });
            return waitMsg ? waitMsg.edit(errPayload) : message.reply(errPayload);
        }
    }
};
