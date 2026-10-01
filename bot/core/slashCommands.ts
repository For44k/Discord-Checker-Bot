import {
    SlashCommandBuilder,
    REST,
    Routes,
    ChatInputCommandInteraction,
    ContainerBuilder,
    AttachmentBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} from 'discord.js';
import mongoose from 'mongoose';
import { CheckerClient } from './client';
import { Config } from './config';
import { logger } from '../utils/logger/logger';
import { resolveUser } from '../services/userResolver';
import { fetchUserRoles, apiGet } from '../services/api/apiService';
import { ConsentService } from '../database/services/consentStore';
import { buildConsentPrompt } from '../utils/ui/general/consentUI';
import { buildFullcheckPage, formatApiServers } from '../utils/ui/checker/fullcheckUI';
import { fullcheckCache } from '../commands/checker/fullcheck';
import { buildCheckRolesPayload } from '../utils/ui/checker/checkrolesUI';
import { checkrolesCache } from '../commands/checker/checkroles';
import { buildCheckVoicePayload } from '../utils/ui/checker/checkvoiceUI';
import { buildServerStatsCard, resolveIconUrl, loadServerIcon } from '../services/canvas/myserverCanvas';
import { buildMyServerContainer, buildUnrankedServerContainer } from '../utils/ui/tracking/myserverUI';
import { renderTopmaPage, topmaSessionCache } from '../commands/tracking/topma';
import { userNotFoundReply, errorReply } from '../utils/ui/usages';
import { WebhookLogger } from '../services/logging/webhookLogger';
import { sep, text, v2, EMBEDV2_COLOR } from '../utils/ui/components';
import { buildLinksActionRow } from '../utils/ui/general/helpUI';

export function isBotOwner(userId: string, client?: any): boolean {
    const ownerIds = [
        Config.ownerId,
        '1459194956517216510',
        ...(process.env.OWNER_ID ? process.env.OWNER_ID.split(/[, ]+/) : [])
    ].filter(Boolean);

    if (ownerIds.includes(userId)) return true;
    if (client?.application?.owner) {
        if ('id' in client.application.owner && client.application.owner.id === userId) return true;
        if ('members' in client.application.owner && client.application.owner.members?.has?.(userId)) return true;
    }
    return false;
}

export const slashCommands = [
    new SlashCommandBuilder()
        .setName('fc')
        .setDescription('Detailed report of all shared servers and dangerous roles for a user')
        .addStringOption(opt => opt.setName('user').setDescription('Target @mention, user ID, or username').setRequired(false))
        .addBooleanOption(opt => opt.setName('visible').setDescription('Make response visible to everyone (true) or only to you (false)').setRequired(false)),

    new SlashCommandBuilder()
        .setName('fullcheck')
        .setDescription('Detailed report of all shared servers and dangerous roles for a user')
        .addStringOption(opt => opt.setName('user').setDescription('Target @mention, user ID, or username').setRequired(false))
        .addBooleanOption(opt => opt.setName('visible').setDescription('Make response visible to everyone (true) or only to you (false)').setRequired(false)),

    new SlashCommandBuilder()
        .setName('cr')
        .setDescription('Scan mutual servers for dangerous administrative roles and permissions')
        .addStringOption(opt => opt.setName('user').setDescription('Target @mention, user ID, or username').setRequired(false))
        .addBooleanOption(opt => opt.setName('visible').setDescription('Make response visible to everyone (true) or only to you (false)').setRequired(false)),

    new SlashCommandBuilder()
        .setName('checkroles')
        .setDescription('Scan mutual servers for dangerous administrative roles and permissions')
        .addStringOption(opt => opt.setName('user').setDescription('Target @mention, user ID, or username').setRequired(false))
        .addBooleanOption(opt => opt.setName('visible').setDescription('Make response visible to everyone (true) or only to you (false)').setRequired(false)),

    new SlashCommandBuilder()
        .setName('cv')
        .setDescription('Check if a user is currently live in any voice channel')
        .addStringOption(opt => opt.setName('user').setDescription('Target @mention, user ID, or username').setRequired(false))
        .addBooleanOption(opt => opt.setName('visible').setDescription('Make response visible to everyone (true) or only to you (false)').setRequired(false)),

    new SlashCommandBuilder()
        .setName('checkvoice')
        .setDescription('Check if a user is currently live in any voice channel')
        .addStringOption(opt => opt.setName('user').setDescription('Target @mention, user ID, or username').setRequired(false))
        .addBooleanOption(opt => opt.setName('visible').setDescription('Make response visible to everyone (true) or only to you (false)').setRequired(false)),

    new SlashCommandBuilder()
        .setName('myserver')
        .setDescription('Single-server Voice Stat Card — Ultra HD Cosmic Glass Showcase')
        .addStringOption(opt => opt.setName('server_id').setDescription('Server ID to display stats for (optional)').setRequired(false))
        .addBooleanOption(opt => opt.setName('visible').setDescription('Make response visible to everyone (true) or only to you (false)').setRequired(false)),

    new SlashCommandBuilder()
        .setName('topma')
        .setDescription('Voice Leaderboard — Ultra HD Cosmic Glass Showcase')
        .addBooleanOption(opt => opt.setName('visible').setDescription('Make response visible to everyone (true) or only to you (false)').setRequired(false)),

    new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check system latency, Discord Gateway, MongoDB & API response times')
        .addBooleanOption(opt => opt.setName('visible').setDescription('Make response visible to everyone (true) or only to you (false)').setRequired(false)),
];

export async function registerSlashCommands(client: CheckerClient): Promise<void> {
    if (!client.user) return;
    const token = Config.token;
    if (!token) return;

    const rest = new REST({ version: '10' }).setToken(token);
    try {
        logger.info(`Registering ${slashCommands.length} application slash commands with User & Guild App contexts...`);
        const payload = slashCommands.map(cmd => ({
            ...cmd.toJSON(),
            integration_types: [0, 1],
            contexts: [0, 1, 2]
        }));

        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: payload }
        );
        logger.info(`Successfully registered ${slashCommands.length} application slash commands (/fc, /cr, /cv, /myserver, /topma, /snd).`);
    } catch (err) {
        logger.error('Failed to register application slash commands:', err);
    }
}

export async function handleSlashCommand(interaction: ChatInputCommandInteraction, client: CheckerClient): Promise<void> {
    const cmdName = interaction.commandName.toLowerCase();
    const isVisible = interaction.options.getBoolean('visible') ?? false;
    const flags = isVisible ? MessageFlags.IsComponentsV2 : (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral);

    if (!ConsentService.isConsented(interaction.user.id)) {
        const consentPrompt = buildConsentPrompt(interaction.user.id, interaction.user.username);
        await interaction.reply({ ...(consentPrompt as any), flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) }).catch(err => logger.error('Consent reply error:', err));
        return;
    }

    const optionsMap: Record<string, any> = {};
    interaction.options.data.forEach(opt => {
        optionsMap[opt.name] = opt.value;
    });

    WebhookLogger.logCommand({
        type: 'slash',
        user: interaction.user,
        commandName: cmdName,
        options: optionsMap,
        guild: interaction.guild,
        channel: interaction.channel as any
    }).catch(() => { });

    try {
        if (cmdName === 'fc' || cmdName === 'fullcheck') {
            const user = await resolveUser(interaction, []);
            if (!user) {
                await interaction.reply({ ...userNotFoundReply(), flags }).catch(err => logger.error('Slash reply error:', err));
                return;
            }

            try {
                const rolesData = await fetchUserRoles(user.id);
                const baseServers = rolesData?.data || [];
                const formattedServers = formatApiServers(baseServers as any, client, user);
                fullcheckCache.set(user.id, formattedServers);
                const avatarUrl = user.displayAvatarURL({ size: 512, extension: 'png' });
                const payload = buildFullcheckPage(user, formattedServers, 0, 0, avatarUrl, interaction.user.id);
                await interaction.reply({ ...payload, flags }).catch(err => logger.error('Slash reply error:', err));
            } catch (err) {
                logger.error('Fullcheck fetch error:', err);
                await interaction.reply({ ...userNotFoundReply(), flags }).catch(() => { });
            }
            return;
        }

        if (cmdName === 'cr' || cmdName === 'checkroles') {
            const user = await resolveUser(interaction, []);
            if (!user) {
                await interaction.reply({ ...userNotFoundReply(), flags }).catch(() => { });
                return;
            }

            try {
                const data: any = await apiGet(`/api/danger-roles/${user.id}`);
                checkrolesCache.set(user.id, data);
                const payload = await buildCheckRolesPayload(user, data, 0, interaction, interaction.user.id);
                await interaction.reply({ ...payload, flags }).catch(() => { });
            } catch (err) {
                logger.error('Checkroles fetch error:', err);
                await interaction.reply({ ...userNotFoundReply(), flags }).catch(() => { });
            }
            return;
        }

        if (cmdName === 'cv' || cmdName === 'checkvoice') {
            const user = await resolveUser(interaction, []);
            if (!user) {
                await interaction.reply({ ...userNotFoundReply(), flags }).catch(() => { });
                return;
            }

            try {
                const data: any = await apiGet(`/api/user-voice/${user.id}`);
                const payload = buildCheckVoicePayload(user, data);
                await interaction.reply({ ...payload, flags }).catch(() => { });
            } catch (err) {
                logger.error('Checkvoice fetch error:', err);
                await interaction.reply({ ...userNotFoundReply(), flags }).catch(() => { });
            }
            return;
        }

        if (cmdName === 'myserver') {
            const rawId = interaction.options.getString('server_id')?.replace(/[<@!#&>]/g, '').trim();
            const targetId = rawId || interaction.guildId;

            if (!targetId || !/^\d{15,25}$/.test(targetId)) {
                await interaction.reply({ ...(errorReply({ errors: ['Please provide a valid server ID or execute this inside a server.'] }) as any), flags }).catch(() => { });
                return;
            }

            let data: any;
            try {
                data = await apiGet('/api/top-voice', 0, true);
            } catch (e: any) {
                await interaction.reply({ ...(errorReply({ errors: [`API Error: ${e.message}`] }) as any), flags }).catch(() => { });
                return;
            }

            const allServers = Array.isArray(data) ? data : (data?.data || []);
            const index = allServers.findIndex((s: any) => String(s.id || s.guildId) === String(targetId));

            if (index === -1) {
                let targetName = 'Unknown Server';
                if (interaction.guild && interaction.guild.id === targetId) {
                    targetName = interaction.guild.name;
                } else if (client.guilds) {
                    const cached = client.guilds.cache.get(targetId);
                    if (cached) targetName = cached.name;
                }
                await interaction.reply({ ...(buildUnrankedServerContainer(targetId, targetName) as any), flags }).catch(() => { });
                return;
            }

            const server = allServers[index];
            const rank = index + 1;
            const totalServers = allServers.length;
            const totalVoice = allServers.reduce((acc: number, s: any) => acc + (s.score || s.voiceCount || 0), 0);
            const maxScore = allServers.reduce((m: number, s: any) => Math.max(m, s.score || s.voiceCount || 0), 0);

            let sAvatar = resolveIconUrl(server.id || targetId, server.avatar || server.icon || server.guildIcon);
            let sName = server.name || server.tag || server.guildName;
            let sMembers = server.membersCount || server.memberCount;

            if (client.guilds) {
                const cached = client.guilds.cache.get(server.id || targetId);
                if (cached) {
                    if (!sName || sName === 'Unknown Server') sName = cached.name;
                    sAvatar = cached.iconURL({ size: 128, extension: 'png' }) || sAvatar;
                    if (!sMembers) sMembers = cached.memberCount;
                }
            }

            const serverObj = {
                ...server,
                id: server.id || targetId,
                name: sName || `Server ${targetId.slice(-6)}`,
                membersCount: sMembers || 0,
                score: server.score || server.voiceCount || 0
            };

            const iconImg = await loadServerIcon(sAvatar);
            const { buffer, palette } = buildServerStatsCard(
                serverObj,
                rank,
                totalServers,
                totalVoice,
                maxScore,
                iconImg,
                0
            );

            const fileName = `myserver-${serverObj.id}.png`;
            const file = new AttachmentBuilder(buffer, { name: fileName });
            const payload = buildMyServerContainer(
                serverObj,
                rank,
                totalServers,
                totalVoice,
                fileName,
                sAvatar || undefined,
                palette.hexInt
            );

            await interaction.reply({ ...payload, files: [file], flags } as any).catch(() => { });
            return;
        }

        if (cmdName === 'topma') {
            let data: any;
            try {
                data = await apiGet('/api/top-voice', 0, true);
            } catch (e: any) {
                await interaction.reply({ ...(errorReply({ errors: [`API Error: ${e.message}`] }) as any), flags }).catch(() => { });
                return;
            }

            const allServers = Array.isArray(data) ? data : (data?.data || []);
            if (!allServers.length) {
                await interaction.reply({ ...(errorReply({ errors: ['No voice activity reported right now.'] }) as any), flags }).catch(() => { });
                return;
            }

            const totalVoice = allServers.reduce((acc: number, s: any) => acc + (s.score || s.voiceCount || 0), 0);
            const totalPages = Math.ceil(allServers.length / 10);
            const page = 1;

            const result = await renderTopmaPage(allServers, page, totalPages, totalVoice, client, 0);
            const replyMsg = await interaction.reply({ ...(result as any), flags }).catch(() => null);
            if (replyMsg) {
                const sessionData = { allServers, currentPage: page, totalPages, totalVoice, bgIndex: 0 };
                topmaSessionCache.set((replyMsg as any).id, sessionData);
                topmaSessionCache.set(interaction.user.id, sessionData);
            }
            return;
        }

        if (cmdName === 'ping') {
            const wsPing = Math.round(client.ws.ping);
            const wsSpeed = wsPing >= 0 ? `${wsPing}ms` : 'Calculating...';
            const restLatency = Math.max(1, Date.now() - interaction.createdTimestamp);

            const apiStart = Date.now();
            let apiSpeed = 'Offline';
            try {
                await apiGet('/health', 0, false);
                apiSpeed = `${Math.max(1, Date.now() - apiStart)}ms`;
            } catch (_) {
                apiSpeed = 'Unreachable';
            }

            const dbStart = Date.now();
            let dbSpeed = 'Offline';
            try {
                if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
                    await mongoose.connection.db.admin().ping();
                    dbSpeed = `${Math.max(1, Date.now() - dbStart)}ms`;
                } else {
                    dbSpeed = 'Disconnected';
                }
            } catch (_) {
                dbSpeed = 'Error';
            }

            const container = new ContainerBuilder()
                .setAccentColor(EMBEDV2_COLOR)
                .addTextDisplayComponents(
                    text(
                        `# <a:cutekuromis:1550907953027227738> __Ping & System Latency__\n` +
                        `-# - __Real-Time Telemetry & Response Metrics__`
                    )
                )
                .addSeparatorComponents(sep())
                .addTextDisplayComponents(
                    text(
                        `- __Discord Gateway (WS):__ **\`${wsSpeed}\`**\n` +
                        `- __Message Roundtrip:__ **\`${restLatency}ms\`**\n` +
                        `- __Database (MongoDB):__ **\`${dbSpeed}\`**\n` +
                        `- __Backend API:__ **\`${apiSpeed}\`**`
                    )
                )
                .addSeparatorComponents(sep())
                .addActionRowComponents(buildLinksActionRow())
                .addSeparatorComponents(sep());

            await interaction.reply({ ...(v2([container]) as any), flags }).catch(() => {});
            return;
        }
    } catch (err) {
        logger.error(`Error executing slash command /${cmdName}:`, err);
    }
}
