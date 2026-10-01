import { ContainerBuilder, Message, ChatInputCommandInteraction } from 'discord.js';
import { sep, text, v2 } from '../ui/components';

export const EMBEDV2_COLOR = 0xBBEDFF;
export const DANGER_COLOR = 0xED4245;

export function buildInvalidUsage(usageText: string, exampleText: string): object {
    const container = new ContainerBuilder()
        .setAccentColor(EMBEDV2_COLOR)
        .addSeparatorComponents(sep())
        .addTextDisplayComponents(
            text(`       # <a:sadkuromi:1535618896390918214> *__Invalid Usage__ :* `)
        )
        .addSeparatorComponents(sep())
        .addTextDisplayComponents(
            text(`## <a:kuromisleeping:1535619223269802018> *__Usage__ :* ${usageText}`)
        )
        .addSeparatorComponents(sep())
        .addTextDisplayComponents(
            text(`### <a:kuromisleeping:1535619223269802018>  *__Example__ :* ${exampleText}`)
        )
        .addSeparatorComponents(sep());

    return v2([container]);
}

export function buildSystemError(detail: string): object {
    const safeDetail = detail ? String(detail).slice(0, 1000) : '';

    const container = new ContainerBuilder()
        .setAccentColor(EMBEDV2_COLOR)
        .addSeparatorComponents(sep())
        .addTextDisplayComponents(
            text(`    # <a:sadkuromi:1535618896390918214> *__System Failed__* `)
        )
        .addSeparatorComponents(sep())
        .addTextDisplayComponents(
            text(`> ### <a:kuromisleeping:1535619223269802018>  *__We are Sorry For that Problem__*`)
        )
        .addSeparatorComponents(sep())
        .addTextDisplayComponents(
            text(`### *__Developers Will Be Fixing Soon <a:cutekuromis:1550907953027227738>__*` + (safeDetail ? `\n\`\`\`${safeDetail}\`\`\`` : ''))
        )
        .addSeparatorComponents(sep());

    return v2([container]);
}
