import { Message, PermissionsBitField, ContainerBuilder } from "discord.js";
import { AlertChannelService } from "../../database/services/alertStore";
import { apiPost } from "../../services/api/apiService";
import { sep, text, v2 } from "../../utils/ui/components";

const EMBEDV2_COLOR = 0xBBEDFF;
const EMOJI_SUCCESS = '<:succes:1494764241142677686>';

export default {
    name: "removealert",
    description: "Disable high-role notifications for this server",
    aliases: ["disablealert", "unsetalert"],

    async execute(message: Message) {
        if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply("Only server administrators can manage alert channels.");
        }

        const guild = message.guild;
        if (!guild) return message.reply("This command must be used in a server.");

        await AlertChannelService.removeChannel(guild.id);
        apiPost(`/api/role-alerts/config/${guild.id}`, {}).catch(() => {});

        const c = new ContainerBuilder()
            .setAccentColor(EMBEDV2_COLOR)
            .addTextDisplayComponents(text(`# ${EMOJI_SUCCESS} __Alert Channel Disabled__`))
            .addSeparatorComponents(sep())
            .addTextDisplayComponents(
                text(
                    `- __Status:__ \`High role notifications have been disabled for this server\``
                )
            )
            .addSeparatorComponents(sep());

        return message.reply(v2([c]));
    }
};
