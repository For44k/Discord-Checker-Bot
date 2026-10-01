import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } from 'discord.js';

export const EMBEDV2_COLOR = 0xBBEDFF;
export const E_LOADING = '<a:WatameNoNoNoNo:1551190717861462096>';

export function buildLoadingReply(messageText: string = 'Searching telemetry and fetching data...'): object {
    const container = new ContainerBuilder()
        .setAccentColor(EMBEDV2_COLOR)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `# ${E_LOADING} __Processing Request...__`
            )
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `> - __Please wait while we gather your telemetry results__\n` +
                `-# - __${messageText}__`
            )
        )
        .addSeparatorComponents(new SeparatorBuilder());

    return {
        flags: MessageFlags.IsComponentsV2,
        components: [container],
        allowedMentions: { parse: [], users: [], roles: [], repliedUser: false },
    };
}
