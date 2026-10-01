import {
    ContainerBuilder,
    User,
    GuildMember,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} from 'discord.js';
import { sep, text, v2, safeSection } from '../components';

const SUPPORT_URL = process.env.SUPPORT_SERVER || process.env.SUPPORT_SERVER_URL || 'https://discord.gg/XEs8UAWhdY';
const EMOJI_HEADER = '<a:cutekuromis:1550907953027227738>';
const EMOJI_RADAR = '<a:05_penguin_football:1550911039657214002>';
const EMOJI_SHIELD = '<:custom_emoji:1550907736999460885>';
const EMOJI_WARN = '<a:warning_animated:1352909221968220170>';
const EMOJI_SAFE = '<a:white_stars:1547180877962944585>';

export interface AltAnalysis {
    accountAgeDays: number;
    accountCreatedAt: Date;
    serverJoinAgeDays: number | null;
    serverJoinedAt: Date | null;
    isDefaultAvatar: boolean;
    avatarUrl: string;
    riskScore: number;
    riskLevel: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' | 'ESTABLISHED';
    flags: string[];
    riskFactors: string[];
    safeFactors: string[];
}

function buildProgressBar(score: number): string {
    const totalBlocks = 10;
    const filledBlocks = Math.round((score / 100) * totalBlocks);
    const emptyBlocks = totalBlocks - filledBlocks;
    return '`[' + '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks) + `] ${score}% Risk\``;
}

export function buildAltCheckerPayload(
    user: User,
    member: GuildMember | null,
    mutualGuildsCount: number,
    analysis: AltAnalysis
): object {
    let accentColor = 0xBBEDFF;
    let verdictEmoji = EMOJI_SAFE;
    let verdictTitle = '__ESTABLISHED ACCOUNT (CLEAN)__';

    if (analysis.riskLevel === 'CRITICAL') {
        accentColor = 0xED4245;
        verdictEmoji = EMOJI_WARN;
        verdictTitle = '__CRITICAL RISK (VERY LIKELY ALT)__';
    } else if (analysis.riskLevel === 'HIGH') {
        accentColor = 0xE67E22;
        verdictEmoji = EMOJI_WARN;
        verdictTitle = '__HIGH SUSPICION (POTENTIAL ALT)__';
    } else if (analysis.riskLevel === 'MODERATE') {
        accentColor = 0xF1C40F;
        verdictEmoji = EMOJI_RADAR;
        verdictTitle = '__MODERATE RISK (RECENT ACCOUNT)__';
    } else if (analysis.riskLevel === 'LOW') {
        accentColor = 0x2ECC71;
        verdictEmoji = EMOJI_SAFE;
        verdictTitle = '__LOW RISK (NORMAL USER)__';
    }

    const createdTs = Math.floor(user.createdTimestamp / 1000);
    const joinedTs = member?.joinedTimestamp ? Math.floor(member.joinedTimestamp / 1000) : null;

    const joinText = joinedTs
        ? `<t:${joinedTs}:F> (<t:${joinedTs}:R>)`
        : '`Not in this server`';

    const flagText = analysis.flags.length > 0
        ? analysis.flags.map(f => `\`${f}\``).join(' • ')
        : '`None (Standard User)`';

    const riskList = analysis.riskFactors.length > 0
        ? analysis.riskFactors.map(r => `-  \`${r}\``).join('\n')
        : '-  `No suspicious risk indicators detected`';

    const safeList = analysis.safeFactors.length > 0
        ? analysis.safeFactors.map(s => `-  \`${s}\``).join('\n')
        : '- ℹ`Standard profile properties`';

    const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setLabel('Support Server')
            .setStyle(ButtonStyle.Link)
            .setURL(SUPPORT_URL)
    );

    const c = new ContainerBuilder()
        .setAccentColor(accentColor)
        .addTextDisplayComponents(
            text(
                `# ${EMOJI_HEADER} __Alt Account & Security Telemetry__\n` +
                `-# - __Deep Account Forensic & Identity Analysis__`
            )
        )
        .addSeparatorComponents(sep())
        .addSectionComponents(
            safeSection(
                `- __Target User:__ <@${user.id}> (\`${user.tag || user.username}\`)\n` +
                `- __User ID:__ \`${user.id}\`\n` +
                `- __Account Age:__ \`${analysis.accountAgeDays} days old\`\n` +
                `- __Created At:__ <t:${createdTs}:F> (<t:${createdTs}:R>)\n` +
                `- __Server Join:__ ${joinText}\n` +
                `- __Mutual Servers:__ \`${mutualGuildsCount}\` monitored mutual guilds`,
                analysis.avatarUrl
            )
        )
        .addSeparatorComponents(sep())
        .addTextDisplayComponents(
            text(
                `## ${verdictEmoji} ${verdictTitle}\n` +
                `- __Risk Index:__ ${buildProgressBar(analysis.riskScore)}\n` +
                `- __Account Badges:__ ${flagText}\n` +
                `- __Avatar Analysis:__ ${analysis.isDefaultAvatar ? '` Default Discord Avatar`' : '` Custom User Avatar`'}`
            )
        )
        .addSeparatorComponents(sep())
        .addTextDisplayComponents(
            text(
                `### ${EMOJI_RADAR} __Risk Indicators__\n${riskList}\n\n` +
                `### ${EMOJI_SHIELD} __Trust Signals__\n${safeList}`
            )
        )
        .addSeparatorComponents(sep())
        .addActionRowComponents(buttonRow)
        .addSeparatorComponents(sep());

    return v2([c]);
}
