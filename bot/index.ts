import { GatewayIntentBits, Partials, Options, ActivityType } from 'discord.js';
import { CheckerClient } from './core/client';
import { connectDatabase } from './database/core/connect';
import { ConsentService } from './database/services/consentStore';
import { logger } from './utils/logger/logger';
import { Config } from './core/config';
import { apiEventStream } from './services/api/apiEventStream';
import { initGlobalFonts } from './services/canvas/fontLoader';
import { dispatchDangerRoleAlert } from './services/alertDispatcher';
import { WsRoleAlertPayload } from './types/apiContracts';
import { WebhookLogger } from './services/logging/webhookLogger';

const MOBILE_PROPERTIES = {
    $os: 'iOS',
    $browser: 'Discord iOS',
    $device: 'Discord iOS',
    os: 'iOS',
    browser: 'Discord iOS',
    device: 'Discord iOS',
};

function patchIdentifyProperties() {
    try {
        const wsPkg = require('@discordjs/ws');
        const ShardCtor = wsPkg.WebSocketShard;
        if (ShardCtor?.prototype?.send && !ShardCtor.prototype.__mobilePatched) {
            const originalSend = ShardCtor.prototype.send;
            ShardCtor.prototype.send = function (payload: { op?: number; d?: { properties?: Record<string, unknown> } }, ...args: unknown[]) {
                if (payload && payload.op === 2 && payload.d) {
                    payload.d.properties = { ...(payload.d.properties || {}), ...MOBILE_PROPERTIES };
                }
                return originalSend.call(this, payload, ...args);
            };
            ShardCtor.prototype.__mobilePatched = true;
        }
    } catch {}

    try {
        const djsWsShard = require('discord.js/src/client/websocket/WebSocketShard.js');
        const ShardCtor = djsWsShard?.default ?? djsWsShard;
        if (ShardCtor?.prototype?.send && !ShardCtor.prototype.__mobilePatched) {
            const originalSend = ShardCtor.prototype.send;
            ShardCtor.prototype.send = function (data: { op?: number; d?: { properties?: Record<string, unknown> } }, ...args: unknown[]) {
                if (data && data.op === 2 && data.d) {
                    data.d.properties = { ...(data.d.properties || {}), ...MOBILE_PROPERTIES };
                }
                return originalSend.call(this, data, ...args);
            };
            ShardCtor.prototype.__mobilePatched = true;
        }
    } catch {}
}

patchIdentifyProperties();
initGlobalFonts();

const client = new CheckerClient({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.GuildMember, Partials.User],
    allowedMentions: {
        parse: [],
        users: [],
        roles: [],
        repliedUser: false,
    },
    makeCache: Options.cacheWithLimits({
        MessageManager: 50,
        PresenceManager: 100,
        ThreadManager: 0,
        StageInstanceManager: 0,
        GuildScheduledEventManager: 0,
        AutoModerationRuleManager: 0,
        ReactionManager: 0,
        ReactionUserManager: 0,
        GuildBanManager: 0,
        GuildInviteManager: 0,
        GuildEmojiManager: 100,
        GuildStickerManager: 0,
    }),
    sweepers: {
        ...Options.DefaultSweeperSettings,
        messages: {
            interval: 300,
            lifetime: 900,
        },
        users: {
            interval: 300,
            filter: () => (user: { bot?: boolean }) => Boolean(user.bot),
        },
    },
    rest: {
        timeout: 8000,
        retries: 2,
    },
});

function forceMobileIdentity() {
    const rawClient = client as unknown as {
        options: { ws?: { properties?: Record<string, string> }; identifyProperties?: Record<string, string> };
        ws?: { options?: { identifyProperties?: Record<string, string>; properties?: Record<string, string> } };
    };
    rawClient.options.ws = { ...(rawClient.options.ws || {}), properties: MOBILE_PROPERTIES };
    if (rawClient.ws?.options) {
        rawClient.ws.options.identifyProperties = MOBILE_PROPERTIES;
        rawClient.ws.options.properties = MOBILE_PROPERTIES;
    }
    if (rawClient.options) {
        rawClient.options.identifyProperties = MOBILE_PROPERTIES;
    }
}

forceMobileIdentity();

function startPresenceRotation() {
    const activities: { name: string; type: ActivityType; state?: string }[] = [
        { name: 'Lazyyyy', type: ActivityType.Custom, state: 'Lazyyyy' },
        { name: '2321', type: ActivityType.Custom, state: '2321' },
        { name: '3067', type: ActivityType.Custom, state: '3067' },
    ];

    let index = 0;

    const setNext = () => {
        if (!client.user) return;
        const act = activities[index];
        client.user.setPresence({
            activities: [{ name: act.name, type: act.type, state: act.state }],
            status: 'idle',
        });
        index = (index + 1) % activities.length;
    };

    setNext();
    setInterval(setNext, 10_000);
}

async function main() {
    try {
        await client.init();
        forceMobileIdentity();
        await connectDatabase();
        await ConsentService.init();
        apiEventStream.connect();

        apiEventStream.on('ROLE_ALERT', (payload: WsRoleAlertPayload) => {
            if (payload && payload.isDangerous) {
                dispatchDangerRoleAlert(client, {
                    guildId: payload.guildId,
                    guildName: payload.guildName,
                    userId: payload.userId,
                    userTag: payload.userTag,
                    userAvatar: payload.userAvatar,
                    isBot: payload.isBot,
                    roleId: payload.roleId,
                    roleName: payload.roleName,
                    action: payload.action,
                    permissions: payload.permissions,
                    executorInfo: payload.executorInfo,
                    timestamp: payload.timestamp
                }).catch(() => {});
            }
        });

        await client.login(Config.token);
        logger.info(`Logged in as ${client.user?.tag} (${client.user?.id})`);
        logger.info(`Loaded ${client.commands.size} commands and ${client.buttons.size + client.selectMenus.size + client.modals.size} interactions.`);

        const { registerSlashCommands } = await import('./core/slashCommands');
        registerSlashCommands(client).catch((err) => {
            logger.error('Failed to register slash commands:', err);
        });

        startPresenceRotation();
    } catch (error) {
        logger.error('Failed to initialize bot:', error);
        process.exit(1);
    }
}

main();
