import {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    FileBuilder,
    MessageFlags
} from 'discord.js';

const EMBEDV2_COLOR = 0xBBEDFF;
const E_SUCCESS = '<a:WatameNoNoNoNo:1551190717861462096>';
const E_FAIL = '<:custom_emoji:1550907736999460885>';

export interface CloneSuccessOptions {
    title: string;
    assetType: string;
    serverId: string;
    serverName?: string;
    count: number;
    sizeBytes: number;
    fileName: string;
}

export function buildCloneSuccessPayload(options: CloneSuccessOptions): object {
    const sizeMB = (options.sizeBytes / (1024 * 1024)).toFixed(2);
    const sizeKB = (options.sizeBytes / 1024).toFixed(1);
    const displaySize = options.sizeBytes > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`;

    const serverDisplay = options.serverName
        ? `${options.serverName} | \`${options.serverId}\``
        : `\`${options.serverId}\``;

    const container = new ContainerBuilder()
        .setAccentColor(EMBEDV2_COLOR)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `# ${E_SUCCESS} __${options.title}__\n` +
                `-# - __All server ${options.assetType} have been successfully archived.__`
            )
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `- __Target Server:__ ${serverDisplay}\n` +
                `- __Total Assets Packaged:__ \`${options.count} ${options.assetType}\`\n` +
                `- __Archive File Size:__ \`${displaySize}\`\n` +
                `- __Archive File Name:__ \`${options.fileName}\``
            )
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addFileComponents(
            new FileBuilder().setURL(`attachment://${options.fileName}`)
        )
        .addSeparatorComponents(new SeparatorBuilder());

    return {
        flags: MessageFlags.IsComponentsV2,
        components: [container],
        allowedMentions: { parse: [], users: [], roles: [], repliedUser: false },
    };
}

export function buildCloneSizeExceededPayload(options: {
    assetType: string;
    serverId: string;
    count: number;
    sizeBytes: number;
    maxLimitMB?: number;
}): object {
    const sizeMB = (options.sizeBytes / (1024 * 1024)).toFixed(2);
    const limitMB = options.maxLimitMB ?? 500;

    const container = new ContainerBuilder()
        .setAccentColor(EMBEDV2_COLOR)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `# ${E_FAIL} __Archive Limit Exceeded__\n` +
                `-# - __The generated asset zip archive exceeds Discord's file upload limit.__`
            )
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `- __Server ID:__ \`${options.serverId}\`\n` +
                `- __Processed ${options.assetType}:__ \`${options.count} Items\`\n` +
                `- __Calculated Archive Size:__ \`${sizeMB} MB\` (Limit: \`${limitMB} MB\`)\n` +
                `- __Notice:__ \`The server archive is larger than the 500MB Discord upload threshold and cannot be sent directly.\``
            )
        )
        .addSeparatorComponents(new SeparatorBuilder());

    return {
        flags: MessageFlags.IsComponentsV2,
        components: [container],
        allowedMentions: { parse: [], users: [], roles: [], repliedUser: false },
    };
}
