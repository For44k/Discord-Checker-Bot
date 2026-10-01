export const standardEmojis = {
  yes: '<:succes:1494764241142677686>',
  info: '<a:cutekuromis:1550907953027227738>',
  title: '<a:kawaiiangrykuromi:1535618976091086888>',
  star: '<a:sparkles:1537825952271302748>',
  arrow: '▶',
  error: '<a:kawaiiangrykuromi:1535618976091086888>',
  sadkuromi: '<a:sadkuromi:1535618896390918214>',
  kuromisleeping: '<a:kuromisleeping:1535619223269802018>',
  kuromithx: '<a:kuromithx:1535785409538170880>'
};

export const themes: Record<string, { color: number; hex: string; emojis: typeof standardEmojis }> = {
  cyan: { color: 0x99faff, hex: '#99faff', emojis: standardEmojis },
  gold: { color: 0xfdff00, hex: '#fdff00', emojis: standardEmojis },
  pink: { color: 0xfb2aff, hex: '#fb2aff', emojis: standardEmojis },
  purple: { color: 0xa18cd1, hex: '#a18cd1', emojis: standardEmojis },
  red: { color: 0xff1d1d, hex: '#ff1d1d', emojis: standardEmojis },
  dark: { color: 0x2b2d31, hex: '#2b2d31', emojis: standardEmojis }
};

export function getTheme(name = 'cyan') {
  return themes[name] || themes.cyan;
}
