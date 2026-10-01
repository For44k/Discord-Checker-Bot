import { ContainerBuilder, MessageFlags } from 'discord.js';
import { getTheme, standardEmojis } from './themeManager';
import { sep, text, v2, EMBEDV2_COLOR } from './components';

export function createStyledEmbed(title: string, description: string, themeName = 'cyan') {
  const theme = getTheme(themeName);
  return {
    color: theme.color,
    title: `${theme.emojis.title}  ${title}`,
    description: description,
    footer: {
      text: 'Checker Analytics Engine',
    }
  };
}

export function errorEmbed(message: string, themeName = 'red') {
  const theme = getTheme(themeName);
  return {
    color: theme.color,
    title: `${theme.emojis.sadkuromi}  Error`,
    description: `### ${theme.emojis.error}  *__${message}__*`,
  };
}

export function successEmbed(message: string, themeName = 'cyan') {
  const theme = getTheme(themeName);
  return {
    color: theme.color,
    title: `${theme.emojis.kuromithx}  Success`,
    description: `### ${theme.emojis.yes}  *__${message}__*`,
  };
}

export function cooldownEmbed(timeLeft: number | string, commandName?: string, themeName = 'cyan') {
  const theme = getTheme(themeName);
  const target = commandName ? ` for \`+${commandName}\`` : '';
  return {
    color: theme.color,
    title: `${standardEmojis.sadkuromi}  Rate Limit Cooldown`,
    description:
      `### ${standardEmojis.error}  __Slow Down!__\n\n` +
      ` -  __Please wait \`${timeLeft}s\`${target} before sending more commands.__\n` +
      ` -  __Anti-spam protection is active to prevent command flooding.__\n`,
    footer: {
      text: 'Checker Anti-Spam & Rate Limiting System',
    }
  };
}

export function cooldownContainer(timeLeft: number | string, commandName?: string): object {
  const target = commandName ? ` before using \`+${commandName}\` again` : ' before executing commands again';
  const container = new ContainerBuilder()
    .setAccentColor(EMBEDV2_COLOR)
    .addTextDisplayComponents(
      text(
        `# <a:hacking:1543386925002661898> __System Rate Limit Cooldown__\n` +
        `-# - __Anti-Spam & Automated Command Protection System__`
      )
    )
    .addSeparatorComponents(sep())
    .addTextDisplayComponents(
      text(
        `## <a:sadkuromi:1535618896390918214> __Too Many Commands__\n` +
        ` - __Status:__ \`Rate Limit\`\n` +
        ` - __Time Remaining:__ <\`${timeLeft}s\` ${target}\n` +
        ` - __Security Notice:__ \`Please wait before sending additional commands to prevent temporary lockout.\``
      )
    )
    .addSeparatorComponents(sep());

  return v2([container]);
}

export function cooldownReply(timeLeft: number | string, commandName?: string): object {
  return cooldownContainer(timeLeft, commandName);
}
