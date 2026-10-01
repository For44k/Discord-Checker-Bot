import { Message, Role } from 'discord.js';
import { StaffService } from '../../database/services/staffStore';
import { buildTrackAddAlreadyTracked, buildTrackAddSuccess } from '../../utils/ui/tracking/trackaddUI';
import { usageExampleReply } from '../../utils/ui/usages';

export default {
    name: 'trackadd',
    description: 'Add a role to the staff tracking list.',
    aliases: ['ta', 'addtrack'],

    async execute(message: Message, args: string[]) {
        const guildId = message.guild?.id;
        if (!guildId) return message.reply('This command must be used in a server.');

        const roleMention = message.mentions.roles.first();
        const roleId = roleMention ? roleMention.id : (args[0] ? args[0].replace(/[<@&>]/g, '').trim() : null);

        if (!roleId || !/^\d{17,20}$/.test(roleId)) {
            return message.reply(usageExampleReply({
                commandName: 'trackadd',
                description: 'Add a role to the staff tracking list',
                usage: '+trackadd <@role/id>',
                example: '+trackadd @Moderator'
            }));
        }

        let roleObj: Role | undefined = roleMention;
        if (!roleObj) {
            try {
                const fetched = await message.guild?.roles.fetch(roleId);
                if (fetched) roleObj = fetched;
            } catch (_) { }
        }

        const roleDisplay = roleObj ? `<@&${roleId}> | \`${roleId}\`` : `\`${roleId}\` *(not found in this server)*`;
        const roles = StaffService.loadStaffRoles(guildId);

        if (roles.includes(roleId)) {
            return message.reply(buildTrackAddAlreadyTracked(roleDisplay, message));
        }

        roles.push(roleId);
        StaffService.saveStaffRoles(guildId, roles);
        return message.reply(buildTrackAddSuccess(roleDisplay, roles, message));
    }
};
