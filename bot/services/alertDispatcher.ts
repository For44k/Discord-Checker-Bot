import { Client, ContainerBuilder, PermissionsBitField } from "discord.js";
import { AlertChannelService } from "../database/services/alertStore";
import { sep, text, v2, safeSection, EMBEDV2_COLOR } from "../utils/ui/components";

const EMOJI_ALERT_ADD = "<a:cutekuromis:1550907953027227738>";
const EMOJI_ALERT_REMOVE = "<a:kawaiiangrykuromi:1535618976091086888>";
const EMOJI_SHIELD = "<a:laughingbear:1551020464476913774>";


const sentAlertCache = new Set<string>();


interface QueuedAlert {
    channelId: string;
    payload: object;
}

const dispatchQueue: QueuedAlert[] = [];
let isProcessingQueue = false;

async function processAlertQueue(client: Client) {
    if (isProcessingQueue) return;
    isProcessingQueue = true;

    while (dispatchQueue.length > 0) {
        const item = dispatchQueue.shift();
        if (!item) break;

        try {
            const ch = client.channels.cache.get(item.channelId) || await client.channels.fetch(item.channelId).catch(() => null);
            if (ch && "send" in ch && typeof (ch as { send: Function }).send === "function") {
                await (ch as { send: (p: object) => Promise<unknown> }).send(item.payload).catch((err: Error) => {
                    console.warn(`[AlertDispatcher] Failed sending to channel ${item.channelId}:`, err?.message || err);
                });
            }
        } catch (err) {
            console.warn(`[AlertDispatcher] Error sending queued alert:`, err);
        }


        await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    isProcessingQueue = false;
}

export async function dispatchDangerRoleAlert(
    client: Client,
    data: {
        guildId: string;
        guildName?: string;
        userId: string;
        userTag?: string;
        userAvatar?: string;
        isBot?: boolean;
        roleId: string;
        roleName?: string;
        action: "added" | "removed";
        permissions?: string[];
        executorInfo?: string;
        timestamp?: number;
    }
): Promise<void> {

    if (data.isBot) return;


    const dedupeKey = `${data.guildId}:${data.userId}:${data.roleId}:${data.action}`;
    if (sentAlertCache.has(dedupeKey)) return;
    sentAlertCache.add(dedupeKey);
    setTimeout(() => sentAlertCache.delete(dedupeKey), 60000);


    let user = client.users.cache.get(data.userId);
    if (!user) {
        user = await client.users.fetch(data.userId).catch(() => null) || undefined;
    }

    if (user?.bot) {
        return;
    }

    const userTag = user?.tag || data.userTag || data.userId;
    const avatar = user?.displayAvatarURL({ size: 512, extension: "png" })
        || data.userAvatar
        || `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(data.userId) % 5n)}.png`;

    const isAdded = data.action === "added";
    const title = isAdded ? "Dangerous Role Granted Alert" : "Dangerous Role Revoked Alert";
    const emojiHeader = isAdded ? EMOJI_ALERT_ADD : EMOJI_ALERT_REMOVE;
    const sectionTitle = isAdded ? "Granted High Permissions" : "Revoked High Permissions";

    const unixTime = data.timestamp ? Math.floor(data.timestamp / 1000) : Math.floor(Date.now() / 1000);
    const guildName = data.guildName || data.guildId;

    const permsDisplay = data.permissions && data.permissions.length > 0
        ? data.permissions.map((p) => `\`${p}\``).join(", ")
        : "`High Server Administrative Permissions`";

    const container = new ContainerBuilder()
        .setAccentColor(EMBEDV2_COLOR)
        .addTextDisplayComponents(
            text(
                `# ${emojiHeader} __${title}__\n` +
                `-# - __Across High Fidelity Servers..!!__`
            )
        )
        .addSeparatorComponents(sep())
        .addSectionComponents(
            safeSection(
                `- __Target User:__ <@${data.userId}> | \`${data.userId}\`\n` +
                `- __Server:__ \`${guildName}\` | \`${data.guildId}\`\n` +
                `- __Timestamp:__ <t:${unixTime}:R>`,
                avatar
            )
        )
        .addSeparatorComponents(sep())
        .addTextDisplayComponents(
            text(
                `## ${EMOJI_SHIELD} __${sectionTitle}__\n` +
                `> - __\`${data.roleName || 'Unknown Role'}\`__ | \`${data.roleId}\`\n` +
                `- __Permission:__ ${permsDisplay}`
            )
        )
        .addSeparatorComponents(sep());

    const payload = v2([container]);

    const specificChannelId = AlertChannelService.getChannel(data.guildId);
    const channelsToSend = specificChannelId
        ? [specificChannelId]
        : AlertChannelService.getAllChannelIds();

    for (const chId of channelsToSend) {

        if (dispatchQueue.length < 50) {
            dispatchQueue.push({ channelId: chId, payload });
        }
    }

    void processAlertQueue(client);
}
