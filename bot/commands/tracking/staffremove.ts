import { Message } from 'discord.js';
import { StaffService } from '../../database/services/staffStore';
import { buildStaffRemoveNotInList, buildStaffRemoveSuccess } from '../../utils/ui/tracking/staffremoveUI';
import { usageExampleReply } from '../../utils/ui/usages';

export default {
    name: 'staffremove',
    description: 'Remove a role from the staff list',

    async execute(message: Message, args: string[]) {
        const guildId = message.guild?.id;
        if (!guildId) return message.reply('This command must be used in a server.');

        const role = message.mentions.roles.first() || (args[0] ? message.guild?.roles.cache.get(args[0]) : null);
        if (!role) {
            return message.reply(usageExampleReply({
                commandName: 'staffremove',
                description: 'Remove a role from the monitored staff roster',
                usage: '+staffremove <@role/id>',
                example: '+staffremove @Moderator'
            }));
        }

        const roleDisplay = `<@&${role.id}> | \`${role.id}\``;
        const roles = StaffService.loadStaffRoles(guildId);
        if (!roles.includes(role.id)) {
            return message.reply(buildStaffRemoveNotInList(roleDisplay));
        }

        const updated = roles.filter(id => id !== role.id);
        StaffService.saveStaffRoles(guildId, updated);
        return message.reply(buildStaffRemoveSuccess(roleDisplay, updated.length, updated));
    }
};
