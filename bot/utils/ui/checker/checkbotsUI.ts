import {
    ContainerBuilder,
    SectionBuilder,
    TextDisplayBuilder,
    ThumbnailBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Message
} from 'discord.js';
import { sep, text, v2, headerSection, safeSection, EMBEDV2_COLOR } from '../components';
import { ServerBotMember } from '../../../types/apiContracts';

const EMOJI_HEADER = '<a:cutekuromis:1550907953027227738>';
const EMOJI_BOT = '<:custom_emoji:1550907736999460885>';
const EMOJI_SAFE = '<a:ice:1543392867219677274>';
const EMOJI_LEFT = '<a:prev:1535661591276814436>';
const EMOJI_RIGHT = '<a:next:1537412085464571957>';

export const BOTS_PER_PAGE = 4;

export function buildCheckBotsError(): object {
    const errContainer = new ContainerBuilder()
        .setAccentColor(EMBEDV2_COLOR)
        .addTextDisplayComponents(
            text(
                `# ${EMOJI_HEADER} __Server Bot Roster__\n` +
                `-# - __Automated Bots & Applications Telemetry__`
            )
        )
        .addSeparatorComponents(sep())
        .addTextDisplayComponents(
            text(
                `# <a:warning_animated:1352909221968220170> __Server Could Not Be Found__\n` +
                `- __Status:__ \`The requested server was not found or has no visibility.\``
            )
        )
        .addSeparatorComponents(sep());
    return v2([errContainer]);
}

export function buildCheckBotsEmpty(guildName: string, iconUrl?: string | null, _message?: Message): object {
    const emptyContainer = new ContainerBuilder()
        .setAccentColor(EMBEDV2_COLOR)
        .addTextDisplayComponents(
            text(
                `# ${EMOJI_HEADER} __Server Bot Roster__\n` +
                `-# - __Automated Bots & Applications Telemetry__`
            )
        )
        .addSeparatorComponents(sep())
        .addSectionComponents(
            headerSection(
                `# ${EMOJI_SAFE} __No Bots Detected__\n` +
                `- __Server:__ \`${guildName}\`\n` +
                `- __Status:__ \`No bot members found in this server.\``,
                iconUrl || undefined
            )
        )
        .addSeparatorComponents(sep());
    return v2([emptyContainer]);
}

export function buildCheckBotsPage(
    bots: Array<ServerBotMember | Record<string, any>>,
    guildName: string,
    iconUrl: string,
    page: number = 0,
    totalPages?: number,
    _message?: Message
): object {
    const total = bots.length;
    const computedTotalPages = totalPages || Math.ceil(total / BOTS_PER_PAGE) || 1;
    const safePage = Math.max(0, Math.min(page, computedTotalPages - 1));

    const start = safePage * BOTS_PER_PAGE;
    const slice = bots.slice(start, start + BOTS_PER_PAGE);

    const container = new ContainerBuilder()
        .setAccentColor(EMBEDV2_COLOR)
        .addTextDisplayComponents(
            text(
                `# ${EMOJI_HEADER} __Server Bot Roster__\n` +
                `-# - __Automated Bots & Applications Telemetry__`
            )
        )
        .addSeparatorComponents(sep())
        .addSectionComponents(
            headerSection(
                `## ${guildName}\n` +
                `- __Total Integrated Bots:__ \`${total}\` Bots\n` +
                `- __Page:__ \`${safePage + 1} / ${computedTotalPages}\``,
                iconUrl
            )
        )
        .addSeparatorComponents(sep());

    slice.forEach((bot, idx) => {
        const botUser = (bot as any).user;
        const botAvatar = (bot as any).avatar || botUser?.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png';
        const botTag = (bot as any).tag || botUser?.tag || botUser?.username || (bot as any).id;
        const botId = (bot as any).id || botUser?.id;

        const rawRoles = (bot as any).roles;
        const rolesList = Array.isArray(rawRoles) ? rawRoles : [];
        const rolesStr = rolesList.length
            ? rolesList.map((r: any) => `__\`${r.name}\`__ | \`${r.id}\``).join('\n> - ')
            : '*None*';

        const highestRoleStr = (bot as any).highestRole
            ? `__\`${(bot as any).highestRole.name}\`__ | \`${(bot as any).highestRole.id}\``
            : '@everyone';
        const nickLine = (bot as any).nickname ? ` *(aka \`${(bot as any).nickname}\`)*` : '';

        const content =
            `### ${EMOJI_BOT} ${botTag}\n` +
            `- __Bot Account:__ <@${botId}> | \`${botId}\`${nickLine}\n` +
            `- __Highest Role:__ ${highestRoleStr}\n` +
            `- __Assigned Roles (${rolesList.length}):__\n` +
            `> - ${rolesStr}`;

        container.addSectionComponents(safeSection(content, botAvatar));

        if (idx < slice.length - 1) {
            container.addSeparatorComponents(sep());
        }
    });

    if (computedTotalPages > 1) {
        container.addSeparatorComponents(sep());
        const buttonsRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(`cb_prev:${guildName}:${safePage}`)
                .setLabel('Previous')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji(EMOJI_LEFT)
                .setDisabled(safePage === 0),
            new ButtonBuilder()
                .setCustomId('cb_label')
                .setLabel(`${safePage + 1} / ${computedTotalPages}`)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId(`cb_next:${guildName}:${safePage}`)
                .setLabel('Next')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji(EMOJI_RIGHT)
                .setDisabled(safePage >= computedTotalPages - 1)
        );

        container.addActionRowComponents(buttonsRow);
    }

    container.addSeparatorComponents(sep());
    return v2([container]);
}
