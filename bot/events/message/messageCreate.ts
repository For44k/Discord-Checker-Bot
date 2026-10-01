import { Message, Events, PermissionsBitField, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } from "discord.js";
import { CheckerClient } from "../../core/client";
import { PrefixService } from "../../database/services/prefixStore";
import { PermissionService } from "../../database/services/permissionStore";
import { ConsentService } from "../../database/services/consentStore";
import { buildConsentPrompt } from "../../utils/ui/general/consentUI";
import { CooldownManager } from "../../utils/cooldown";
import { logger } from "../../utils/logger/logger";
import { Config } from "../../core/config";
import { errorReply } from "../../utils/ui/usages";
import { cooldownReply } from "../../utils/ui/replies";
import { WebhookLogger } from "../../services/logging/webhookLogger";

const DEFAULT_PREFIX = "+";
const EMBEDV2_COLOR = 0xBBEDFF;

const configuredOwners = (process.env.OWNER_IDS || process.env.OWNER_ID || Config.ownerId || "")
    .split(/[,;\s]+/)
    .map(s => s.trim())
    .filter(Boolean);

const BOT_OWNERS = new Set([
    "1287172309785776278",
    ...configuredOwners
]);

export default {
    name: Events.MessageCreate,
    async execute(message: Message, client: CheckerClient) {
        if (!message || !message.content || message.author?.bot) return;

        const content = message.content.trim();
        const guildId = message.guild?.id || "dm";
        const guildPrefix = PrefixService.getSync(guildId) || DEFAULT_PREFIX;

        let usedPrefix: string | null = null;
        const botMention = `<@${client.user?.id}>`;
        const botNickMention = `<@!${client.user?.id}>`;

        if (content.startsWith(guildPrefix)) {
            usedPrefix = guildPrefix;
        } else if (content.startsWith(DEFAULT_PREFIX)) {
            usedPrefix = DEFAULT_PREFIX;
        } else if (content.startsWith(botMention)) {
            usedPrefix = botMention;
        } else if (content.startsWith(botNickMention)) {
            usedPrefix = botNickMention;
        }

        if (!usedPrefix) return;

        const rawWithoutPrefix = content.slice(usedPrefix.length).trimStart();
        if (!rawWithoutPrefix) return;

        const spaceIdx = rawWithoutPrefix.indexOf(" ");
        const commandName = (spaceIdx === -1 ? rawWithoutPrefix : rawWithoutPrefix.slice(0, spaceIdx)).toLowerCase();
        const argsRaw = spaceIdx === -1 ? "" : rawWithoutPrefix.slice(spaceIdx + 1).trim();
        const args = argsRaw ? argsRaw.split(/\s+/) : [];

        if (!commandName) return;

        const resolvedName = client.aliases.get(commandName) || commandName;
        const command = client.commands.get(resolvedName);
        if (!command) return;

        const isBotOwner = BOT_OWNERS.has(message.author.id);

        if (!isBotOwner && !ConsentService.isConsented(message.author.id)) {
            const consentPrompt = buildConsentPrompt(message.author.id, message.author.username);
            return message.reply(consentPrompt).catch(() => { });
        }

        const isServerOwner = message.guild ? message.guild.ownerId === message.author.id : false;

        const isAdmin = message.member?.permissions?.has(PermissionsBitField.Flags.Administrator) ?? false;

        if (message.guild && !isBotOwner && !isServerOwner && !isAdmin) {
            const allowedRoles = PermissionService.getRoles(message.guild.id);
            const allowedUsers = PermissionService.getUsers(message.guild.id);
            if (allowedRoles.length > 0 || allowedUsers.length > 0) {
                const member = message.member || message.guild.members.cache.get(message.author.id);
                const hasRole = allowedRoles.length > 0 && (member?.roles?.cache?.hasAny(...allowedRoles) ?? false);
                const hasUser = allowedUsers.includes(message.author.id);
                if (!hasRole && !hasUser) {
                    return;
                }
            }
        }


        if (!isBotOwner) {
            const rateLimit = CooldownManager.checkRateLimit(message.author.id, 3, 8000, 30000);
            if (rateLimit.onCooldown) {
                if (rateLimit.shouldNotify) {
                    const replyPayload = cooldownReply(rateLimit.timeLeft, resolvedName);
                    const replyMsg = await message.reply(replyPayload as any).catch(() => null);
                    if (replyMsg) {
                        setTimeout(() => replyMsg.delete().catch(() => {}), 4000);
                    }
                }
                return;
            }
        }


        if (!isBotOwner && !isAdmin) {
            const cdDuration = (typeof command.cooldown === "number" && command.cooldown > 0)
                ? (command.cooldown > 100 ? command.cooldown : command.cooldown * 1000)
                : 800;

            const cooldown = CooldownManager.check(message.author.id, resolvedName, cdDuration);
            if (cooldown.onCooldown) {
                if (cooldown.shouldNotify) {
                    const replyPayload = cooldownReply(cooldown.timeLeft, resolvedName);
                    const replyMsg = await message.reply(replyPayload as any).catch(() => null);
                    if (replyMsg) {
                        setTimeout(() => replyMsg.delete().catch(() => {}), 3000);
                    }
                }
                return;
            }
        }

        try {
            WebhookLogger.logCommand({
                type: 'prefix',
                user: message.author,
                commandName: resolvedName,
                args,
                guild: message.guild,
                channel: message.channel as any
            }).catch(() => {});

            await command.execute(message, args, client);
        } catch (error: unknown) {
            logger.error(`Error executing command ${commandName}:`, error);
        }
    }
};
