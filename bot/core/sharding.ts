import { ShardingManager } from 'discord.js';
import { join } from 'path';
import { existsSync } from 'fs';
import { Config } from './config';

const tsPath = join(__dirname, '../index.ts');
const jsPath = join(__dirname, '../index.js');
const entryFile = existsSync(tsPath) ? tsPath : jsPath;

const manager = new ShardingManager(entryFile, {
    token: Config.token || process.env.DISCORD_TOKEN || process.env.TOKEN,
    totalShards: 'auto',
    execArgv: entryFile.endsWith('.ts') ? ['--import', 'tsx'] : []
});

manager.on('shardCreate', shard => {
    console.log(`[SHARDING] Launched shard ${shard.id}`);
});

manager.spawn().catch(err => {
    console.error(`[SHARDING ERROR] Failed to spawn shards:`, err);
});
