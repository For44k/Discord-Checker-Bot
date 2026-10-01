import { Message } from 'discord.js';
import { StaffService } from '../../database/services/staffStore';
import { buildStaffListEmpty, buildStaffListPayload } from '../../utils/ui/tracking/stafflistUI';

export default {
    name: 'stafflist',
    description: 'List all staff roles',

    async execute(message: Message, args: string[]) {
        const guildId = message.guild?.id;
        if (!guildId) return message.reply('This command must be used in a server.');

        const roles = StaffService.loadStaffRoles(guildId);
        if (!roles.length) {
            return message.reply(buildStaffListEmpty());
        }

        return message.reply(buildStaffListPayload(roles, message));
    }
};
