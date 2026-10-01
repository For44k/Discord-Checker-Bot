import { WebhookClient, EmbedBuilder, User, Guild, TextBasedChannel } from 'discord.js';
import { Config } from '../../core/config';
import { logger } from '../../utils/logger/logger';
import os from 'os';

const EMBED_COLOR = 0xBBEDFF;
const E_STARS = '<a:white_stars:1547180877962944585>';
const E_INFO = '<:custom_emoji:1550907736999460885>';
const DEFAULT_LOG_WEBHOOK = 'https://canary.discord.com/api/webhooks/1551207723394404402/fmJGDi2qR6eQuIwJ_OEYthsAV_7adgLeHsaZxs6CKXWNpZCs94waxUv3iIs0AyEETsRc';

let webhookClient: WebhookClient | null = null;

function getWebhookClient(): WebhookClient | null {
    const url = Config.errorWebhook || process.env.ERROR_WEBHOOK_URL || DEFAULT_LOG_WEBHOOK;
    if (!url) return null;

    if (!webhookClient) {
        try {
            webhookClient = new WebhookClient({ url });
        } catch (err) {
            logger.error('[WebhookLogger] Failed to initialize WebhookClient:', err);
        }
    }
    return webhookClient;
}

export class WebhookLogger {
    public static async logStartup(clientUser: any): Promise<void> {
        const client = getWebhookClient();
        if (!client) return;

        try {
            let publicIp = 'Unknown';
            try {
                const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3000) });
                if (res.ok) {
                    const json: any = await res.json();
                    publicIp = json.ip || 'Unknown';
                }
            } catch {}

            const hostname = os.hostname();
            const platform = `${os.type()} ${os.release()} (${os.arch()})`;
            const userInfo = os.userInfo();
            const systemUser = userInfo.username || 'root';

            const botTag = clientUser?.tag || clientUser?.username || 'Unknown';
            const botId = clientUser?.id || 'Unknown';
            const botAvatar = clientUser?.displayAvatarURL?.({ size: 256, extension: 'png' }) || 'https://cdn.discordapp.com/embed/avatars/0.png';

            const embed = new EmbedBuilder()
                .setColor(0x57F287)
                .setTitle(`🚀 Instance Started & Initialized`)
                .setThumbnail(botAvatar)
                .setDescription(
                    `### ${E_STARS} **Bot Identity**\n` +
                    `- **Bot Username:** \`${botTag}\`\n` +
                    `- **Bot User ID:** \`${botId}\`\n` +
                    `- **Mention:** <@${botId}>\n\n` +
                    `### 🌐 **Host & Network Telemetry**\n` +
                    `- **Public IP Address:** \`${publicIp}\`\n` +
                    `- **System Hostname:** \`${hostname}\`\n` +
                    `- **OS Platform:** \`${platform}\`\n` +
                    `- **System User:** \`${systemUser}\``
                )
                .setFooter({ text: `Instance Startup Telemetry • ${botId}` })
                .setTimestamp();

            await client.send({
                username: 'Checker Instance Logs',
                avatarURL: botAvatar,
                embeds: [embed]
            }).catch(() => {});
        } catch (err) {
            logger.error('[WebhookLogger] Error sending startup log:', err);
        }
    }

    public static async logCommand(data: {
        type: 'prefix' | 'slash';
        user: User;
        commandName: string;
        args?: string[];
        options?: Record<string, any>;
        guild?: Guild | null;
        channel?: TextBasedChannel | null;
    }): Promise<void> {
        const client = getWebhookClient();
        if (!client) return;

        try {
            const isSlash = data.type === 'slash';
            const prefix = isSlash ? '/' : '+';
            const user = data.user;
            const guild = data.guild;
            const channel = data.channel;

            let commandString = `${prefix}${data.commandName}`;
            if (isSlash && data.options && Object.keys(data.options).length > 0) {
                const optStr = Object.entries(data.options)
                    .map(([k, v]) => `${k}: \`${v}\``)
                    .join(' ');
                commandString += ` ${optStr}`;
            } else if (!isSlash && data.args && data.args.length > 0) {
                commandString += ` ${data.args.join(' ')}`;
            }

            const guildDisplay = guild
                ? `**${guild.name}** | \`${guild.id}\``
                : '`Direct Message (DM)`';

            const channelDisplay = channel && 'name' in channel
                ? `<#${channel.id}> | \`${channel.id}\``
                : (channel ? `\`${channel.id}\`` : '`Direct Message`');

            const avatarUrl = user.displayAvatarURL({ size: 256, extension: 'png' });

            const embed = new EmbedBuilder()
                .setColor(EMBED_COLOR)
                .setTitle(`⚡ ${isSlash ? 'Slash' : 'Prefix'} Command Executed`)
                .setThumbnail(avatarUrl)
                .setDescription(
                    `### ${E_STARS} **Command Information**\n` +
                    `- **Command:** \`${prefix}${data.commandName}\`\n` +
                    `- **Execution Type:** \`${isSlash ? 'Slash Command (/)' : 'Prefix Command (+)'}\`\n` +
                    `- **Full Input:** ${commandString.length > 400 ? commandString.substring(0, 397) + '...' : commandString}\n\n` +
                    `### 👤 **User Information**\n` +
                    `- **User:** <@${user.id}>\n` +
                    `- **Tag / Username:** \`${user.tag || user.username}\`\n` +
                    `- **User ID:** \`${user.id}\`\n\n` +
                    `### 📍 **Location Details**\n` +
                    `- **Server:** ${guildDisplay}\n` +
                    `- **Channel:** ${channelDisplay}`
                )
                .setFooter({ text: `Checker Telemetry • User: ${user.id}` })
                .setTimestamp();

            await client.send({
                username: 'Checker Activity Logs',
                avatarURL: 'https://cdn.discordapp.com/embed/avatars/0.png',
                embeds: [embed]
            }).catch(err => logger.error('[WebhookLogger] Error sending command log:', err));
        } catch (err) {
            logger.error('[WebhookLogger] Unexpected error in logCommand:', err);
        }
    }

    public static async logGuildJoin(guild: Guild, clientInstance?: any): Promise<void> {
        const client = getWebhookClient();
        if (!client) return;

        try {
            const iconUrl = guild.iconURL({ size: 256, extension: 'png' }) || 'https://cdn.discordapp.com/embed/avatars/0.png';
            const totalGuilds = clientInstance?.guilds?.cache?.size || 'N/A';

            let ownerTag = 'Unknown';
            try {
                const owner = await guild.fetchOwner().catch(() => null);
                if (owner?.user) {
                    ownerTag = `<@${owner.id}> | \`${owner.id}\``;
                }
            } catch { }

            const embed = new EmbedBuilder()
                .setColor(0x57F287)
                .setTitle(`🎉 Added to New Server!`)
                .setThumbnail(iconUrl)
                .setDescription(
                    `### ${E_STARS} **Server Information**\n` +
                    `- **Server Name:** **${guild.name}**\n` +
                    `- **Server ID:** \`${guild.id}\`\n` +
                    `- **Server Owner:** ${ownerTag}\n` +
                    `- **Member Count:** \`${guild.memberCount?.toLocaleString() || 'N/A'}\` members\n\n` +
                    `### 📊 **Global Bot Status**\n` +
                    `- **Total Servers Now:** \`${totalGuilds}\` servers`
                )
                .setFooter({ text: `Guild Join Telemetry • ${guild.id}` })
                .setTimestamp();

            await client.send({
                username: 'Checker Server Logs',
                avatarURL: iconUrl,
                embeds: [embed]
            }).catch(err => logger.error('[WebhookLogger] Error sending guild join log:', err));
        } catch (err) {
            logger.error('[WebhookLogger] Unexpected error in logGuildJoin:', err);
        }
    }

    public static async logGuildLeave(guild: Guild, clientInstance?: any): Promise<void> {
        const client = getWebhookClient();
        if (!client) return;

        try {
            const iconUrl = guild.iconURL({ size: 256, extension: 'png' }) || 'https://cdn.discordapp.com/embed/avatars/0.png';
            const remainingGuilds = clientInstance?.guilds?.cache?.size || 'N/A';

            const embed = new EmbedBuilder()
                .setColor(0xED4245)
                .setTitle(`👋 Removed from Server`)
                .setThumbnail(iconUrl)
                .setDescription(
                    `### ${E_INFO} **Server Information**\n` +
                    `- **Server Name:** **${guild.name}**\n` +
                    `- **Server ID:** \`${guild.id}\`\n` +
                    `- **Member Count:** \`${guild.memberCount?.toLocaleString() || 'N/A'}\` members\n\n` +
                    `### 📊 **Global Bot Status**\n` +
                    `- **Remaining Servers:** \`${remainingGuilds}\` servers`
                )
                .setFooter({ text: `Guild Leave Telemetry • ${guild.id}` })
                .setTimestamp();

            await client.send({
                username: 'Checker Server Logs',
                avatarURL: iconUrl,
                embeds: [embed]
            }).catch(err => logger.error('[WebhookLogger] Error sending guild leave log:', err));
        } catch (err) {
            logger.error('[WebhookLogger] Unexpected error in logGuildLeave:', err);
        }
    }
}
