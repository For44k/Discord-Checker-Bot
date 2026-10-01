import { Message, ChannelType, PermissionsBitField, ContainerBuilder } from "discord.js";
import { AlertChannelService } from "../../database/services/alertStore";
import { apiPost } from "../../services/api/apiService";
import { sep, text, v2 } from "../../utils/ui/components";

const EMBEDV2_COLOR = 0xBBEDFF;
const EMOJI_HEADER = '<a:cutekuromis:1550907953027227738>';
const EMOJI_SUCCESS = '<:succes:1494764241142677686>';

export default {
    name: "setalert",
    description: "Configure the notification channel for high-role alerts",
    aliases: ["alertchannel", "setnotif", "notifchannel", "alerthighroles"],

    async execute(message: Message, args: string[]) {
        if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply("Only server administrators can configure the alert channel.");
        }

        const guild = message.guild;
        if (!guild) return message.reply("This command must be used in a server.");

        const channelMention = message.mentions.channels.first();
        const rawId = args[0] ? args[0].replace(/[<#>]/g, "").trim() : null;
        const channel = channelMention || (rawId ? guild.channels.cache.get(rawId) : null);

        if (!channel || channel.type !== ChannelType.GuildText) {
            const current = AlertChannelService.getChannel(guild.id);
            const currentDisplay = current ? `<#${current}> | \`${current}\`` : "`None`";

            const c = new ContainerBuilder()
                .setAccentColor(EMBEDV2_COLOR)
                .addTextDisplayComponents(
                    text(
                        `# ${EMOJI_HEADER} __High Role Alert Configuration__\n` +
                        `> - **__Current Channel:__** ${currentDisplay}`
                    )
                )
                .addSeparatorComponents(sep())
                .addTextDisplayComponents(
                    text(
                        `- __Usage:__ \`+setalert <#channel>\`\n` +
                        `- __Disable:__ \`+removealert\``
                    )
                )
                .addSeparatorComponents(sep());

            return message.reply(v2([c]));
        }

        await AlertChannelService.setChannel(guild.id, channel.id);
        apiPost("/api/role-alerts/config", { guildId: guild.id, channelId: channel.id }).catch(() => {});

        const c = new ContainerBuilder()
            .setAccentColor(EMBEDV2_COLOR)
            .addTextDisplayComponents(text(`# ${EMOJI_SUCCESS} __Alert Channel Configured__`))
            .addSeparatorComponents(sep())
            .addTextDisplayComponents(
                text(
                    `- __Channel:__ <#${channel.id}> | \`${channel.id}\`\n` +
                    `- __Status:__ \`Instant alerts enabled for high & admin roles\``
                )
            )
            .addSeparatorComponents(sep());

        return message.reply(v2([c]));
    }
};
