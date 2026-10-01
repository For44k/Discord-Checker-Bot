import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } from 'discord.js';

const EMBEDV2_COLOR = 0xBBEDFF;
const E_WATAME = '<a:WatameNoNoNoNo:1551190717861462096>';
const E_FETCH_FAIL = '<:custom_emoji:1550907736999460885>';

export interface UsageOptions {
    commandName: string;
    description: string;
    usage: string;
    example?: string;
    user?: any;
    accentColorHex?: string;
}

export function usageExampleReply(options: UsageOptions): object {
    const cleanUsage = options.usage.replace(/[*_`]/g, '').trim();
    const formattedUsage = cleanUsage.startsWith('+') ? cleanUsage : `+${cleanUsage}`;
    const cmdName = options.commandName.charAt(0).toUpperCase() + options.commandName.slice(1);

    let content = `- __Usage:__ \`${formattedUsage}\``;
    if (options.example) {
        const cleanExample = options.example.replace(/[*_`]/g, '').trim();
        const formattedExample = cleanExample.startsWith('+') ? cleanExample : `+${cleanExample}`;
        content += `\n- __Example:__ \`${formattedExample}\``;
    }

    const container = new ContainerBuilder()
        .setAccentColor(EMBEDV2_COLOR)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `# ${E_WATAME} __${cmdName} Command__\n` +
                `> - **__${options.description}__**`
            )
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(content))
        .addSeparatorComponents(new SeparatorBuilder());

    return {
        flags: MessageFlags.IsComponentsV2,
        components: [container],
        allowedMentions: { parse: [], users: [], roles: [], repliedUser: false },
    };
}

export function userNotFoundReply(): object {
    const container = new ContainerBuilder()
        .setAccentColor(EMBEDV2_COLOR)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `# ${E_FETCH_FAIL} __Fetching Failed__`
            )
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `- __I can't find that user in any server__\n` +
                `- __Try To correct id or useranme__`
            )
        )
        .addSeparatorComponents(new SeparatorBuilder());

    return {
        flags: MessageFlags.IsComponentsV2,
        components: [container],
        allowedMentions: { parse: [], users: [], roles: [], repliedUser: false },
    };
}

export function errorReply(options: { title?: string; errors: string[]; user?: any }): object {
    const titleText = options.title
        ? `# ${E_FETCH_FAIL} __${options.title}__`
        : `# ${E_FETCH_FAIL} __Fetching Failed__`;

    const errorLines = (options.errors && options.errors.length > 0)
        ? options.errors.map(err => {
            const clean = err.replace(/^[>\s*-]+/, '').trim();
            return `- __${clean}__`;
        }).join('\n')
        : `- __I can't find that user in any server__\n- __Try To correct id or useranme__`;

    const container = new ContainerBuilder()
        .setAccentColor(EMBEDV2_COLOR)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(titleText))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(errorLines))
        .addSeparatorComponents(new SeparatorBuilder());

    return {
        flags: MessageFlags.IsComponentsV2,
        components: [container],
        allowedMentions: { parse: [], users: [], roles: [], repliedUser: false },
    };
}
