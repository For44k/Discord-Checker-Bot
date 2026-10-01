import {
    ContainerBuilder,
    SectionBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Message
} from 'discord.js';
import { sep, text, v2, headerSection, safeSection } from '../components';
import { ServerAdminMember } from '../../../types/apiContracts';

const EMBEDV2_COLOR = 0xBBEDFF;
const EMOJI_HEADER = '<a:cutekuromis:1550907953027227738>';
const EMOJI_SAFE = '<a:ice:1543392867219677274>';
const EMOJI_LEFT = '<a:prev:1535661591276814436>';
const EMOJI_RIGHT = '<a:next:1537412085464571957>';

export const ADMINS_PER_PAGE = 3;

function createAdminSection(admin: ServerAdminMember | Record<string, any>): SectionBuilder {
    const adminUser = (admin as any).user;
    const uId = (admin as any).id || adminUser?.id || 'unknown';
    const uTag = (admin as any).tag || adminUser?.tag || adminUser?.username || uId;
    const nickLine = (admin as any).nickname ? ` *(aka \`${(admin as any).nickname}\`)*` : '';

    const isOwner = Boolean((admin as any).isOwner);
    const statusText = isOwner ? '**Server Owner**' : '**Administrator**';

    const rolesList = (admin as any).adminRoles || (admin as any).roles || [];
    let rolesDisplay = '*None*';
    if (Array.isArray(rolesList) && rolesList.length > 0) {
        rolesDisplay = rolesList.map((r: any) => `**\`${r.name || 'Role'}\`** | \`${r.id || 'N/A'}\``).join('  ・  ');
    } else if (isOwner) {
        rolesDisplay = '*Owner (Bypasses role requirement)*';
    }

    const avatarUrl = (admin as any).avatar || adminUser?.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png';

    const content =
        `## ${uTag}\n` +
        `- __User Mention:__ <@${uId}> | \`${uId}\`${nickLine}\n` +
        `- __Status:__ ${statusText}\n` +
        `- __Admin Role(s):__ ${rolesDisplay}`;

    return safeSection(content, avatarUrl);
}

export function buildListAdminsEmpty(guildName: string, serverId?: string, guildIcon?: string | null): object {
    const c = new ContainerBuilder()
        .setAccentColor(EMBEDV2_COLOR)
        .addTextDisplayComponents(
            text(
                `# ${EMOJI_HEADER} __Server Administrator Audit__\n` +
                `-# - __Privileged Staff & Governance Overview__`
            )
        )
        .addSeparatorComponents(sep())
        .addSectionComponents(
            headerSection(
                `# ${EMOJI_SAFE} __No Administrators Found__\n` +
                `- __Server Name:__ ${guildName}\n` +
                `- __Server ID:__ \`${serverId || 'N/A'}\`\n` +
                `- __Status:__ \`No members with ADMINISTRATOR permissions were detected\``,
                guildIcon || undefined
            )
        )
        .addSeparatorComponents(sep());

    return v2([c]);
}

export function buildListAdminsPage(
    admins: Array<ServerAdminMember | Record<string, any>>,
    guildName: string,
    serverId: string,
    guildIcon: string | null,
    page: number = 0,
    totalPages?: number,
    _message?: Message
): object {
    const total = admins.length;
    const computedTotalPages = totalPages || Math.ceil(total / ADMINS_PER_PAGE) || 1;
    const safePage = Math.max(0, Math.min(page, computedTotalPages - 1));

    const start = safePage * ADMINS_PER_PAGE;
    const slice = admins.slice(start, start + ADMINS_PER_PAGE);

    const container = new ContainerBuilder()
        .setAccentColor(EMBEDV2_COLOR)
        .addTextDisplayComponents(
            text(
                `# ${EMOJI_HEADER} __Server Administrator Audit__\n` +
                `-# - __Privileged Staff & Governance Overview__`
            )
        )
        .addSeparatorComponents(sep())
        .addSectionComponents(
            headerSection(
                `## ${guildName}\n` +
                `- __Server ID:__ \`${serverId}\`\n` +
                `- __Total Administrators:__ **\`${total}\`**\n` +
                `- __Viewing Page:__ \`${safePage + 1} / ${computedTotalPages}\``,
                guildIcon || undefined
            )
        )
        .addSeparatorComponents(sep());

    slice.forEach((admin, idx) => {
        container.addSectionComponents(createAdminSection(admin));
        if (idx < slice.length - 1) {
            container.addSeparatorComponents(sep());
        }
    });

    container.addSeparatorComponents(sep());

    if (computedTotalPages > 1) {
        const buttonsRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(`la_prev:${serverId}:${safePage}`)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji(EMOJI_LEFT)
                .setDisabled(safePage === 0),
            new ButtonBuilder()
                .setCustomId(`la_count:${serverId}:${safePage}`)
                .setLabel(`${safePage + 1} / ${computedTotalPages}`)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId(`la_next:${serverId}:${safePage}`)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji(EMOJI_RIGHT)
                .setDisabled(safePage >= computedTotalPages - 1)
        );

        container.addActionRowComponents(buttonsRow);
        container.addSeparatorComponents(sep());
    }

    return v2([container]);
}
