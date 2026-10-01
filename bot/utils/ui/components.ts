import {
    ContainerBuilder,
    SectionBuilder,
    TextDisplayBuilder,
    ThumbnailBuilder,
    SeparatorBuilder,
    MessageFlags,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageCreateOptions,
    MessageReplyOptions,
    MessageEditOptions,
    InteractionReplyOptions,
} from 'discord.js';

export const EMBEDV2_COLOR = 0xBBEDFF;

export const COLORS = {
    primary: 0xBBEDFF,
    gold: 0xFFD700,
    success: 0x57F287,
    warning: 0xFEE75C,
    danger: 0xED4245,
    neutral: 0x2B2D31,
};

export const EMOJIS = {
    Q: '<a:pinkquestionmark:1540060689245405214>',
    T: '-',
    L: '<a:loveletter:1540061036437184642>',
    SUCCESS: '<a:white_stars:1547180877962944585>',
    SHIELD: '<:custom_emoji:1550907736999460885>',
    WARN: '<a:warning_animated:1352909221968220170>',
    KUROMI_ANGRY: '<a:kawaiiangrykuromi:1535618976091086888>',
    LEFT: '◀',
    RIGHT: '▶',
};

export function sep(): SeparatorBuilder {
    return new SeparatorBuilder();
}

export function text(content: string): TextDisplayBuilder {
    return new TextDisplayBuilder().setContent(content);
}

export const DEFAULT_THUMBNAIL = 'https://cdn.discordapp.com/embed/avatars/0.png';

export function safeThumbUrl(url?: string | null): string {
    if (url && typeof url === 'string' && /^https?:\/\//i.test(url.trim())) {
        return url.trim();
    }
    return DEFAULT_THUMBNAIL;
}

export function headerSection(content: string, thumbUrl?: string | null): SectionBuilder {
    return new SectionBuilder()
        .addTextDisplayComponents(text(content))
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(safeThumbUrl(thumbUrl)));
}

export function safeSection(content: string, thumbUrl?: string | null): SectionBuilder {
    return new SectionBuilder()
        .addTextDisplayComponents(text(content))
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(safeThumbUrl(thumbUrl)));
}

export type V2MessagePayload = MessageReplyOptions & {
    flags?: any;
    components?: any[];
};

export function v2(containers: ContainerBuilder[]): any {
    return {
        flags: MessageFlags.IsComponentsV2,
        components: containers,
        allowedMentions: { parse: [], users: [], roles: [], repliedUser: false },
    };
}

export function footerLine(_context?: any, _customNote?: string): string {
    return '';
}

export function navRow(prefix: string, page: number, totalPages: number): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(`${prefix}_prev`)
            .setLabel('Previous')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji(EMOJIS.LEFT)
            .setDisabled(page === 0 || page === 1),
        new ButtonBuilder()
            .setCustomId(`${prefix}_count`)
            .setLabel(`${page + 1} / ${totalPages}`)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId(`${prefix}_next`)
            .setLabel('Next')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji(EMOJIS.RIGHT)
            .setDisabled(page >= totalPages - 1 || page >= totalPages)
    );
}

export function errorContainer(title: string, detail: string): ContainerBuilder {
    return new ContainerBuilder()
        .setAccentColor(EMBEDV2_COLOR)
        .addSeparatorComponents(sep())
        .addTextDisplayComponents(text(
            `# ${EMOJIS.Q} __${title}__\n` +
            `${EMOJIS.T} *${detail}*`
        ))
        .addSeparatorComponents(sep());
}
