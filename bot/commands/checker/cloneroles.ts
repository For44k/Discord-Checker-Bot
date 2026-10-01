import { Message, AttachmentBuilder, PermissionFlagsBits } from 'discord.js';
import AdmZip from 'adm-zip';
import { apiGet } from '../../services/api/apiService';
import { usageExampleReply, errorReply } from '../../utils/ui/usages';
import { buildLoadingReply } from '../../utils/ui/general/loadingUI';
import { buildCloneSuccessPayload, buildCloneSizeExceededPayload } from '../../utils/ui/checker/cloneUI';

const MAX_DISCORD_UPLOAD_BYTES = 500 * 1024 * 1024;

export default {
    name: 'cloneroles',
    description: 'Download all role icons from a server into a zip file',
    aliases: ['roleszip', 'downloadroles', 'clonerole'],
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
                commandName: 'cloneroles',
                description: 'Export all server role icons into a zip file',
                usage: '+cloneroles <serverId>',
                example: '+cloneroles 899768606789877810'
            }));
        }

        const waitMsg = await message.reply(buildLoadingReply('Downloading and archiving role icons...')).catch(() => null);

        let data: any;
        try {
            data = await apiGet(`/api/server-roles-icons/${serverId}`);
        } catch (e: any) {
            const notFound = errorReply({
                title: 'Fetching Failed',
                errors: [`API Error: ${e.message}`]
            });
            return waitMsg ? waitMsg.edit(notFound) : message.reply(notFound);
        }

        if (!data || !data.success || !data.roles || data.roles.length === 0) {
            const notFound = errorReply({
                title: 'Fetching Failed',
                errors: [`Could not find any role icons for server \`${serverId}\`.`]
            });
            return waitMsg ? waitMsg.edit(notFound) : message.reply(notFound);
        }

        try {
            const zip = new AdmZip();
            let count = 0;

            await Promise.allSettled(data.roles.map(async (role: any) => {
                if (role.icon) {
                    try {
                        const res = await fetch(role.icon);
                        if (res.ok) {
                            const buffer = Buffer.from(await res.arrayBuffer());
                            const safeName = (role.name || 'role').replace(/[/\\?%*:|"<>]/g, '_');
                            zip.addFile(`${safeName}_${role.id}.png`, buffer);
                            count++;
                        }
                    } catch { }
                }
            }));

            if (count === 0) {
                const errPayload = errorReply({
                    title: 'Export Failed',
                    errors: ['Failed to download any role icons from the server.']
                });
                return waitMsg ? waitMsg.edit(errPayload) : message.reply(errPayload);
            }

            const zipBuffer = zip.toBuffer();

            if (zipBuffer.length > MAX_DISCORD_UPLOAD_BYTES) {
                const limitPayload = buildCloneSizeExceededPayload({
                    assetType: 'Role Icons',
                    serverId,
                    count,
                    sizeBytes: zipBuffer.length,
                    maxLimitMB: 500
                });
                return waitMsg ? waitMsg.edit(limitPayload) : message.reply(limitPayload);
            }

            const fileName = `roles_icons_${serverId}.zip`;
            const attachment = new AttachmentBuilder(zipBuffer, { name: fileName });
            const successPayload = buildCloneSuccessPayload({
                title: 'Role Icons Cloned',
                assetType: 'Role Icons',
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
