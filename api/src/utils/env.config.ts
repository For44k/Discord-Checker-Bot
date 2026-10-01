import dotenv from 'dotenv';
dotenv.config();

function getEnv(key: string): string {
    const val = process.env[key];
    if (!val) throw new Error(`Environment variable ${key} is required but not defined`);
    return val;
}

const discordUserTokens: string[] = [];

if (process.env.DISCORD_USER_TOKENS) {
    try {
        const trimmed = process.env.DISCORD_USER_TOKENS.trim();
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
                discordUserTokens.push(...parsed.map((t) => String(t).trim()).filter((t) => t.length > 0));
            }
        } else {
            const tokens = process.env.DISCORD_USER_TOKENS
                .replace(/\s+/g, ' ')
                .trim()
                .split(',')
                .map((t) => t.trim())
                .filter((t) => t.length > 0);
            discordUserTokens.push(...tokens);
        }
    } catch {
        const tokens = process.env.DISCORD_USER_TOKENS
            .replace(/\s+/g, ' ')
            .trim()
            .split(',')
            .map((t) => t.trim())
            .filter((t) => t.length > 0);
        discordUserTokens.push(...tokens);
    }
}

if (discordUserTokens.length === 0 && process.env.DISCORD_USER_TOKEN) {
    discordUserTokens.push(...process.env.DISCORD_USER_TOKEN.split(',').map((t) => t.trim()));
}

export const config = {
    PORT: parseInt(process.env.PORT || '3115', 10),
    MONGODB_URI: getEnv('MONGODB_URI'),
    DISCORD_USER_TOKENS: discordUserTokens,
    DISCORD_USER_TOKEN: discordUserTokens[0] || '',
    API_KEY: getEnv('API_KEY'),
    NODE_ENV: process.env.NODE_ENV || 'production',
};
