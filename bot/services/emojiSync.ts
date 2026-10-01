import { Client } from 'discord.js';
import { Emojis } from '../utils/ui/emojis';
import { logger } from '../utils/logger/logger';

export async function syncApplicationEmojis(client: Client): Promise<void> {
    const shouldUpload = process.env.AUTO_UPLOAD_EMOJIS === 'true';
    if (!shouldUpload || !client.application) return;

    logger.info('[EmojiSync] AUTO_UPLOAD_EMOJIS is enabled. Syncing application emojis...');

    try {
        const appEmojis = await client.application.emojis.fetch();
        const existingNames = new Map(appEmojis.map(e => [e.name, e]));

        for (const [key, rawString] of Object.entries(Emojis)) {
            const match = String(rawString).match(/<(a)?:([a-zA-Z0-9_]+):(\d+)>/);
            if (!match) continue;

            const isAnimated = Boolean(match[1]);
            const name = match[2];
            const emojiId = match[3];

            if (existingNames.has(name)) {
                const existing = existingNames.get(name)!;
                (Emojis as any)[key] = `<${existing.animated ? 'a' : ''}:${existing.name}:${existing.id}>`;
                continue;
            }

            try {
                const cdnUrl = `https://cdn.discordapp.com/emojis/${emojiId}.${isAnimated ? 'gif' : 'png'}?quality=lossless`;
                const created = await client.application.emojis.create({
                    attachment: cdnUrl,
                    name: name
                });

                logger.info(`[EmojiSync] Created application emoji: ${created.name} (${created.id})`);
                (Emojis as any)[key] = `<${created.animated ? 'a' : ''}:${created.name}:${created.id}>`;
            } catch (err: any) {
                logger.error(`[EmojiSync] Failed to upload emoji ${name}:`, err?.message || err);
            }
        }

        logger.info('[EmojiSync] Application emojis synchronization finished.');
    } catch (error: any) {
        logger.error('[EmojiSync] Error syncing application emojis:', error?.message || error);
    }
}
