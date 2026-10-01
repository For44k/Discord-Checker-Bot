import { ContainerBuilder, SectionBuilder, ThumbnailBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import { EMBEDV2_COLOR, sep, text, v2 } from '../components';

const SUPPORT_URL = process.env.SUPPORT_SERVER || process.env.SUPPORT_SERVER_URL || 'https://discord.gg/XEs8UAWhdY';
const E_INFO = '<:custom_emoji:1550907736999460885>';
const E_SUCCESS = '<a:white_stars:1547180877962944585>';
const E_FAIL = '<a:WatameNoNoNoNo:1551190717861462096>';

export function buildGpUsagePayload(prefix: string = '+'): object {
    const supportBtn = new ButtonBuilder()
        .setLabel('Support Server')
        .setStyle(ButtonStyle.Link)
        .setURL(SUPPORT_URL);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(supportBtn);

    const c = new ContainerBuilder()
        .setAccentColor(EMBEDV2_COLOR)
        .addTextDisplayComponents(
            text(
                `# ${E_INFO} __Bot Guild Profile Manager__\n` +
                `> - **__Customize how the bot appears specifically inside this server.__**`
            )
        )
        .addSeparatorComponents(sep())
        .addTextDisplayComponents(
            text(
                `- __Avatar:__ \`${prefix}gp avatar <url or attach image>\`\n` +
                `- __Banner:__ \`${prefix}gp banner <url or attach image>\`\n` +
                `- __Nickname:__ \`${prefix}gp name <nickname>\`\n` +
                `- __Server Bio:__ \`${prefix}gp bio <custom bio text>\`\n` +
                `- __Reset Profile:__ \`${prefix}gp reset\``
            )
        )
        .addSeparatorComponents(sep())
        .addTextDisplayComponents(
            text(
                `- __Examples:__\n` +
                `  - \`${prefix}gp avatar https://i.imgur.com/image.png\`\n` +
                `  - \`${prefix}gp name Guard Assistant\`\n` +
                `  - \`${prefix}gp reset\``
            )
        )
        .addSeparatorComponents(sep())
        .addActionRowComponents(row)
        .addSeparatorComponents(sep());

    return v2([c]);
}

export function buildGpSuccessPayload(fieldLabel: string, detail: string, previewUrl?: string | null): object {
    const c = new ContainerBuilder()
        .setAccentColor(EMBEDV2_COLOR)
        .addTextDisplayComponents(text(`# ${E_SUCCESS} __Guild Profile Updated__`))
        .addSeparatorComponents(sep());

    if (previewUrl && /^https?:\/\//i.test(previewUrl)) {
        c.addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(
                    text(
                        `- __Target Field:__ **\`${fieldLabel}\`**\n` +
                        `- __Status:__ **\`Applied Successfully\`**\n` +
                        `- __Info:__ ${detail}`
                    )
                )
                .setThumbnailAccessory(new ThumbnailBuilder().setURL(previewUrl))
        );
    } else {
        c.addTextDisplayComponents(
            text(
                `- __Target Field:__ **\`${fieldLabel}\`**\n` +
                `- __Status:__ **\`Applied Successfully\`**\n` +
                `- __Info:__ ${detail}`
            )
        );
    }

    c.addSeparatorComponents(sep());

    return v2([c]);
}

export function buildGpErrorPayload(title: string, errorMessage: string, tip?: string): object {
    let body = `- __Issue:__ ${errorMessage}`;
    if (tip) {
        body += `\n- __Correct Usage:__ \`${tip}\``;
    }

    const c = new ContainerBuilder()
        .setAccentColor(EMBEDV2_COLOR)
        .addTextDisplayComponents(text(`# ${E_FAIL} __${title}__`))
        .addSeparatorComponents(sep())
        .addTextDisplayComponents(text(body))
        .addSeparatorComponents(sep());

    return v2([c]);
}
