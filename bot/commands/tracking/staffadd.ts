import { Message } from 'discord.js';
import { StaffService } from '../../database/services/staffStore';
import { buildStaffAddAlreadyInList, buildStaffAddSuccess } from '../../utils/ui/tracking/staffaddUI';
import { usageExampleReply } from '../../utils/ui/usages';

export default {
    name: 'staffadd',
    description: 'Add a role to the staff list',

    async execute(message: Message, args: string[]) {
        const guildId = message.guild?.id;
        if (!guildId) return message.reply('This command must be used in a server.');

        const role = message.mentions.roles.first() || (args[0] ? message.guild?.roles.cache.get(args[0]) : null);
        if (!role) {
            return message.reply(usageExampleReply({
                commandName: 'staffadd',
                description: 'Add a role to the monitored staff roster',
                usage: '+staffadd <@role/id>',
                example: '+staffadd @Moderator'
            }));
        }

        const roleDisplay = `<@&${role.id}> | \`${role.id}\``;
        const roles = StaffService.loadStaffRoles(guildId);
        if (roles.includes(role.id)) {
            return message.reply(buildStaffAddAlreadyInList(roleDisplay));
        }

        roles.push(role.id);
        StaffService.saveStaffRoles(guildId, roles);
        return message.reply(buildStaffAddSuccess(roleDisplay, roles.length, roles));
    }
};
