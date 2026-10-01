import { Message, AttachmentBuilder, PermissionFlagsBits } from 'discord.js';
import AdmZip from 'adm-zip';
import { apiGet } from '../../services/api/apiService';
import { usageExampleReply, errorReply } from '../../utils/ui/usages';
import { buildLoadingReply } from '../../utils/ui/general/loadingUI';
import { buildCloneSuccessPayload, buildCloneSizeExceededPayload } from '../../utils/ui/checker/cloneUI';

const MAX_DISCORD_UPLOAD_BYTES = 500 * 1024 * 1024;

export default {
    name: 'cloneemoji',
    description: 'Download all custom emojis from a server into a zip file',
    aliases: ['emojiszip', 'downloademojis', 'cloneemojis', 'emojizip'],
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
                commandName: 'cloneemoji',
                description: 'Export all server custom emojis into a zip file',
                usage: '+cloneemoji <serverId>',
                example: '+cloneemoji 899768606789877810'
            }));
        }

        const waitMsg = await message.reply(buildLoadingReply('Downloading and archiving custom emojis...')).catch(() => null);

        let data: any;
        try {
            data = await apiGet(`/api/server-emojis/${serverId}`);
        } catch (e: any) {
            const notFound = errorReply({
                title: 'Fetching Failed',
                errors: [`API Error: ${e.message}`]
            });
            return waitMsg ? waitMsg.edit(notFound) : message.reply(notFound);
        }

        const emojis = Array.isArray(data?.emojis) ? data.emojis : (Array.isArray(data?.data) ? data.data : []);
        if (!data || !data.success || !emojis || emojis.length === 0) {
            const notFound = errorReply({
                title: 'Fetching Failed',
                errors: [`Could not find any emojis for server \`${serverId}\`.`]
            });
            return waitMsg ? waitMsg.edit(notFound) : message.reply(notFound);
        }

        try {
            const zip = new AdmZip();
            let count = 0;

            await Promise.allSettled(emojis.map(async (emoji: any) => {
                try {
                    const ext = emoji.animated ? 'gif' : 'png';
                    const url = emoji.url || `https://cdn.discordapp.com/emojis/${emoji.id}.${ext}`;
                    const res = await fetch(url);
                    if (res.ok) {
                        const buffer = Buffer.from(await res.arrayBuffer());
                        const safeName = (emoji.name || 'emoji').replace(/[/\\?%*:|"<>]/g, '_');
                        zip.addFile(`${safeName}_${emoji.id}.${ext}`, buffer);
                        count++;
                    }
                } catch { }
            }));

            if (count === 0) {
                const errPayload = errorReply({
                    title: 'Export Failed',
                    errors: ['Failed to download any emojis from the server.']
                });
                return waitMsg ? waitMsg.edit(errPayload) : message.reply(errPayload);
            }

            const zipBuffer = zip.toBuffer();

            if (zipBuffer.length > MAX_DISCORD_UPLOAD_BYTES) {
                const limitPayload = buildCloneSizeExceededPayload({
                    assetType: 'Custom Emojis',
                    serverId,
                    count,
                    sizeBytes: zipBuffer.length,
                    maxLimitMB: 500
                });
                return waitMsg ? waitMsg.edit(limitPayload) : message.reply(limitPayload);
            }

            const fileName = `server_emojis_${serverId}.zip`;
            const attachment = new AttachmentBuilder(zipBuffer, { name: fileName });
            const successPayload = buildCloneSuccessPayload({
                title: 'Server Emojis Cloned',
                assetType: 'Custom Emojis',
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
