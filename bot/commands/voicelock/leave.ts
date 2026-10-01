import { Message, ContainerBuilder, PermissionsBitField } from "discord.js";
import { getVoiceConnection } from "@discordjs/voice";
import { VoiceLockStore } from "../../database/services/voiceLockStore";
import { PermissionService } from "../../database/services/permissionStore";
import { sep, text, v2 } from "../../utils/ui/components";

const EMBEDV2_COLOR = 0xBBEDFF;

export default {
    name: "leave",
    description: "Leave the locked voice channel and stop 24/7 connection",
    aliases: ["vcleave", "unlockvoice", "disconnect"],

    async execute(message: Message | any) {
        const guild = message.guild;
        if (!guild) return message.reply("This command must be used in a server.");

        const isOwner = guild.ownerId === (message.author?.id || message.user?.id);
        const isAdmin = message.member?.permissions?.has(PermissionsBitField.Flags.Administrator);
        const allowedRoles = PermissionService.getRoles(guild.id);
        const allowedUsers = PermissionService.getUsers(guild.id);
        const hasAllowedRole = allowedRoles.length > 0 && message.member?.roles?.cache?.hasAny(...allowedRoles);
        const hasAllowedUser = allowedUsers.includes(message.author?.id || message.user?.id);

        if (!isOwner && !isAdmin && !hasAllowedRole && !hasAllowedUser) {
            const errC = new ContainerBuilder()
                .setAccentColor(0xED4245)
                .addTextDisplayComponents(text("## Permission Denied\nYou need Administrator permission or an authorized role/user to unlock voice channels."));
            return message.reply(v2([errC]));
        }

        const connection = getVoiceConnection(guild.id);
        if (connection) {
            connection.destroy();
        }

        VoiceLockStore.removeChannel(guild.id);

        const c = new ContainerBuilder()
            .setAccentColor(EMBEDV2_COLOR)
            .addTextDisplayComponents(text("# <a:miaw:1543607484390969404>  Disconnected"))
            .addSeparatorComponents(sep())
            .addTextDisplayComponents(text("Successfully left the voice channel and cleared 24/7 lock."))
            .addSeparatorComponents(sep());

        return message.reply(v2([c]));
    }
};
