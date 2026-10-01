import {
    ContainerBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize
} from 'discord.js';
import { v2, safeSection } from '../components';

const EMBEDV2_COLOR = 0xBBEDFF;
const EMOJI_WELCOME = '<:custom_emoji:1550907736999460885>';
const EMOJI_PREV = '<a:prev:1535661591276814436>';
const EMOJI_NEXT = '<a:next:1537412085464571957>';

const DEVELOPER_ID = '1287172309785776278';
const DEVELOPER_URL = `https://discord.com/users/${DEVELOPER_ID}`;

export interface CommandInfo {
    name: string;
    aliases: string[];
    usage: string;
    desc: string;
}

export interface HelpCategory {
    key: string;
    name: string;
    label: string;
    description: string;
    commands: CommandInfo[];
}

export const helpCategories: HelpCategory[] = [
    {
        key: 'checker',
        name: 'Checker',
        label: 'Checker Commands',
        description: 'Investigate users, mutual servers, voice channels, and dangerous roles.',
        commands: [
            { name: 'fullcheck', aliases: ['fc', 'full', 'whois'], usage: '+fullcheck <@user/id>', desc: 'Detailed report of all shared servers & roles per server.' },
            { name: 'checkvoice', aliases: ['cv', 'voicecheck'], usage: '+checkvoice <@user/id>', desc: 'Check if a user is currently live in a voice channel.' },
            { name: 'checkroles', aliases: ['cr', 'checkrole'], usage: '+checkroles <@user/id>', desc: 'List dangerous administrative permissions across servers.' },
            { name: 'checkdevice', aliases: ['cd', 'device'], usage: '+checkdevice <@user/id>', desc: 'Inspect active client devices and real-time presence.' },
            { name: 'serverboosts', aliases: ['sb', 'checkboost'], usage: '+serverboosts <@user/id>', desc: 'View all servers boosted by target user and tier dates.' },
            { name: 'checkbots', aliases: ['cb', 'listbots'], usage: '+checkbots <serverId>', desc: 'List all bots on a server with their highest roles.' },
            { name: 'altchecker', aliases: ['altcheck', 'alt', 'ac'], usage: '+altchecker <@user/id>', desc: 'Inspect account age, avatar analysis & alt account risk score.' },
            { name: 'cloneroles', aliases: [], usage: '+cloneroles <serverId>', desc: 'Export all server role icons into a downloadable zip file.' },
            { name: 'cloneemoji', aliases: [], usage: '+cloneemoji <serverId>', desc: 'Export all custom server emojis into a downloadable zip file.' },
            { name: 'clonestickers', aliases: [], usage: '+clonestickers <serverId>', desc: 'Export all server stickers into a downloadable zip file.' },
        ]
    },
    {
        key: 'info',
        name: 'Server Info',
        label: 'Server Info Commands',
        description: 'Retrieve server details, admin lists, and ranking.',
        commands: [
            { name: 'serverinfo', aliases: ['si'], usage: '+serverinfo [serverId]', desc: 'Get stats, owner, vanity URL, and top role of a server.' },
            { name: 'listadmins', aliases: ['la', 'admins'], usage: '+listadmins <serverId>', desc: 'List all server members holding Administrator permissions.' },
            { name: 'myserver', aliases: [], usage: '+myserver', desc: 'Check your server\'s ranking on the global voice leaderboard.' },
        ]
    },
    {
        key: 'tracking',
        name: 'Staff & Tracking',
        label: 'Staff & Activity Tracking',
        description: 'Track staff activity, manage monitored channels, and check stats.',
        commands: [
            { name: 'ship', aliases: ['love', 'match'], usage: '+ship <@user1> <@user2>', desc: 'Calculate real mutual guilds, VC overlap time & affinity score.' },
            { name: 'uservoice', aliases: ['uv'], usage: '+uservoice <@user/id>', desc: 'Deep identity & frosted glass voice activity stats card.' },
            { name: 'topma', aliases: ['tma'], usage: '+topma', desc: 'Morocco active voice leaderboards showcase.' },
            { name: 'trackstaff', aliases: ['ts'], usage: '+trackstaff <@user/id>', desc: 'View detailed activity stats for a staff member.' },
            { name: 'staffadd', aliases: [], usage: '+staffadd <@role/id>', desc: 'Add a role to the staff tracking system.' },
            { name: 'stafflist', aliases: [], usage: '+stafflist', desc: 'List all staff roles currently being monitored.' },
            { name: 'staffremove', aliases: [], usage: '+staffremove <@role/id>', desc: 'Remove a role from staff tracking.' },
            { name: 'trackadd', aliases: ['ta'], usage: '+trackadd <#channel/id>', desc: 'Enable activity tracking in a text or voice channel.' },
            { name: 'trackremove', aliases: ['tr'], usage: '+trackremove <#channel/id>', desc: 'Disable activity tracking in a channel.' },
        ]
    },
    {
        key: 'config',
        name: 'Configuration',
        label: 'Bot Configuration',
        description: 'Configure bot permissions, prefix, and server profile appearance.',
        commands: [
            { name: 'checker', aliases: ['checkers', 'access'], usage: '+checker <add/remove/list>', desc: 'Manage authorized roles and users allowed to use bot commands.' },
            { name: 'checker add', aliases: ['checkeradd'], usage: '+checker add <@role/@user/id>', desc: 'Grant bot command authorization to a role or user.' },
            { name: 'checker remove', aliases: ['checkerremove'], usage: '+checker remove <@role/@user/id>', desc: 'Revoke bot command authorization from a role or user.' },
            { name: 'checker list', aliases: ['checkerlist'], usage: '+checker list', desc: 'List all authorized checker roles and users.' },
            { name: 'prefix', aliases: [], usage: '+prefix <newPrefix>', desc: 'Change the custom bot prefix for this server.' },
            { name: 'ghostmode', aliases: ['gm'], usage: '+ghostmode', desc: 'Toggle your private visibility in checker scans.' },
            { name: 'gp', aliases: ['guildprofile'], usage: '+gp <field> <value>', desc: 'View or customize bot avatar, name, bio, or banner per server.' },
        ]
    },
    {
        key: 'voicelock',
        name: 'Voice Lock',
        label: 'Voice Lock 24/7',
        description: 'Keep the bot connected to your voice channel 24/7.',
        commands: [
            { name: 'join', aliases: [], usage: '+join <channelId>', desc: 'Lock the bot into a voice channel 24/7 permanently.' },
            { name: 'leave', aliases: [], usage: '+leave', desc: 'Disconnect and release the bot from voice lock.' },
        ]
    },
    {
        key: 'support',
        name: 'Support',
        label: 'Support & Assistance',
        description: 'Get help or contact developers for custom bot requests.',
        commands: [
            { name: 'help', aliases: ['h', 'commands'], usage: '+help', desc: 'Open this interactive help menu.' },
            { name: 'ping', aliases: ['p', 'pong'], usage: '+ping', desc: 'Real-time respond, database and API speeds in ms.' },
            { name: 'support', aliases: ['sp'], usage: '+support', desc: 'Open the support panel to report bugs or request assistance.' },
        ]
    }
];

export function getSupportServerUrl(): string {
    return process.env.SUPPORT_SERVER || process.env.SUPPORT_SERVER_URL || 'https://discord.gg/';
}

export function buildHelpSelectMenu(activeKey: string | null = null, disabled: boolean = false): StringSelectMenuBuilder {
    return new StringSelectMenuBuilder()
        .setCustomId('help_category_select')
        .setPlaceholder('Select a command category...')
        .setDisabled(disabled)
        .addOptions(
            helpCategories.map(cat => ({
                label: cat.name,
                description: cat.description.slice(0, 100),
                value: cat.key,
                default: activeKey === cat.key,
            }))
        );
}

export function buildLinksActionRow(): ActionRowBuilder<ButtonBuilder> {
    const devBtn = new ButtonBuilder()
        .setLabel('Contact Developer')
        .setStyle(ButtonStyle.Link)
        .setURL(DEVELOPER_URL);

    const supportBtn = new ButtonBuilder()
        .setLabel('Join Support Server')
        .setStyle(ButtonStyle.Link)
        .setURL(getSupportServerUrl());

    return new ActionRowBuilder<ButtonBuilder>().addComponents(devBtn, supportBtn);
}

const sep = () => new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true);

export function buildHelpMainPayload(currentPrefix: string, botAvatarURL: string, botName: string = '2321', disabled: boolean = false): object {
    const container = new ContainerBuilder()
        .setAccentColor(EMBEDV2_COLOR)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `# ${EMOJI_WELCOME} __Welcome to:__ **${botName}**`
            )
        )
        .addSeparatorComponents(sep())
        .addSectionComponents(
            safeSection(
                `- __Server Prefix:__ **\`${currentPrefix}\`**\n` +
                `- __High-performance multi-server telemetry & security suite.__\n` +
                `- __Investigate mutual guilds, dangerous admin roles & account details.__\n` +
                `- __Monitor real-time voice channels, staff activity & leaderboard stats.__\n` +
                `- __Lock bot into voice 24/7 and backup server emojis, roles & stickers.__\n` +
                `- __Pick a category from the dropdown menu below to view all commands.__`,
                botAvatarURL
            )
        )
        .addSeparatorComponents(sep())
        .addActionRowComponents(
            new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(buildHelpSelectMenu(null, disabled))
        )
        .addSeparatorComponents(sep())
        .addActionRowComponents(buildLinksActionRow());

    return v2([container]);
}

export function buildHelpCategoryPayload(
    categoryKey: string,
    currentPrefix: string,
    botAvatarURL: string,
    botName: string = '2321',
    page: number = 0,
    disabled: boolean = false
): object {
    const category = helpCategories.find(c => c.key === categoryKey);
    if (!category) return buildHelpMainPayload(currentPrefix, botAvatarURL, botName, disabled);

    const pageSize = 5;
    const totalPages = Math.ceil(category.commands.length / pageSize) || 1;
    const safePage = Math.max(0, Math.min(page, totalPages - 1));
    const start = safePage * pageSize;
    const visibleCommands = category.commands.slice(start, start + pageSize);

    const commandLines = visibleCommands.map((cmd) => {
        return `**\`${currentPrefix}${cmd.name}\`**\n> - __${cmd.desc}__`;
    }).join('\n\n');

    const container = new ContainerBuilder()
        .setAccentColor(EMBEDV2_COLOR)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `# ${category.name} __Commands__`
            )
        )
        .addSeparatorComponents(sep())
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                commandLines
            )
        )
        .addSeparatorComponents(sep())
        .addActionRowComponents(
            new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(buildHelpSelectMenu(categoryKey, disabled))
        );

    if (totalPages > 1) {
        const prevBtn = new ButtonBuilder()
            .setCustomId('help_prev')
            .setEmoji(EMOJI_PREV)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled || safePage === 0);

        const nextBtn = new ButtonBuilder()
            .setCustomId('help_next')
            .setEmoji(EMOJI_NEXT)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled || safePage >= totalPages - 1);

        container.addActionRowComponents(new ActionRowBuilder<ButtonBuilder>().addComponents(prevBtn, nextBtn));
        container.addSeparatorComponents(sep());
    }

    container.addActionRowComponents(buildLinksActionRow());

    return v2([container]);
}
