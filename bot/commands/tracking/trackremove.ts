import { Message, Role } from "discord.js";
import { StaffService } from "../../database/services/staffStore";
import { buildTrackRemoveNotTracked, buildTrackRemoveSuccess } from "../../utils/ui/tracking/trackremoveUI";

export default {
    name: "trackremove",
    description: "Remove a role from the staff tracking list.",
    aliases: ["tr", "removetrack", "untrack"],

    async execute(message: Message, args: string[]) {
        const guildId = message.guild?.id;
        if (!guildId) return message.reply("This command must be used in a server.");

        const roleMention = message.mentions.roles.first();
        const roleId = roleMention ? roleMention.id : (args[0] ? args[0].replace(/[<@&>]/g, "").trim() : null);

        if (!roleId || !/^\d{17,20}$/.test(roleId)) {
            return message.reply("Usage: `+trackremove <@role/id>`");
        }

        let roleObj: Role | undefined = roleMention;
        if (!roleObj) {
            try {
                const fetched = await message.guild?.roles.fetch(roleId);
                if (fetched) roleObj = fetched;
            } catch (_) { }
        }

        const roleDisplay = roleObj ? `<@&${roleId}> | \`${roleId}\`` : `\`${roleId}\``;
        const roles = StaffService.loadStaffRoles(guildId);

        if (!roles.includes(roleId)) {
            return message.reply(buildTrackRemoveNotTracked(roleDisplay, message));
        }

        const removed = roles.filter(r => r !== roleId);
        StaffService.saveStaffRoles(guildId, removed);
        return message.reply(buildTrackRemoveSuccess(roleDisplay, removed, message));
    }
};
