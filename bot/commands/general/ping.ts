import {
    ContainerBuilder,
    Message
} from 'discord.js';
import { sep, text, v2, EMBEDV2_COLOR } from '../../utils/ui/components';
import { buildLinksActionRow } from '../../utils/ui/general/helpUI';
import { apiGet } from '../../services/api/apiService';
import mongoose from 'mongoose';

const EMOJI_HEADER = '<a:cutekuromis:1550907953027227738>';

export default {
    name: 'ping',
    description: 'Check Respond speed, Database speed and API speed',
    aliases: ['latency', 'p', 'pong'],

    async execute(message: Message | any) {
        const wsPing = Math.round(message.client.ws.ping);
        const wsSpeed = wsPing >= 0 ? `${wsPing}ms` : 'Calculating...';
        const restLatency = Math.max(1, Date.now() - (message.createdTimestamp || Date.now()));

        const apiStart = Date.now();
        let apiSpeed = 'Offline';
        try {
            await apiGet('/health', 0, false);
            apiSpeed = `${Math.max(1, Date.now() - apiStart)}ms`;
        } catch (_) {
            apiSpeed = 'Unreachable';
        }

        const dbStart = Date.now();
        let dbSpeed = 'Offline';
        try {
            if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
                await mongoose.connection.db.admin().ping();
                dbSpeed = `${Math.max(1, Date.now() - dbStart)}ms`;
            } else {
                dbSpeed = 'Disconnected';
            }
        } catch (_) {
            dbSpeed = 'Error';
        }

        const container = new ContainerBuilder()
            .setAccentColor(EMBEDV2_COLOR)
            .addTextDisplayComponents(
                text(
                    `# ${EMOJI_HEADER} __Ping & System Latency__\n` +
                    `-# - __Real-Time Telemetry & Response Metrics__`
                )
            )
            .addSeparatorComponents(sep())
            .addTextDisplayComponents(
                text(
                    `- __Discord Gateway (WS):__ **\`${wsSpeed}\`**\n` +
                    `- __Message Roundtrip:__ **\`${restLatency}ms\`**\n` +
                    `- __Database (MongoDB):__ **\`${dbSpeed}\`**\n` +
                    `- __Backend API:__ **\`${apiSpeed}\`**`
                )
            )
            .addSeparatorComponents(sep())
            .addActionRowComponents(buildLinksActionRow())
            .addSeparatorComponents(sep());

        return message.reply(v2([container]));
    }
};
