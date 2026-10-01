import { discordClientManager } from "../client/clientManager.js";

export interface MassDmResult {
    totalRecipients: number;
    sent: number;
    failed: number;
    errors: { userId: string; reason: string }[];
}

export interface MetaQuestResult {
    clientUser: {
        id: string | null;
        username: string | null;
        tag: string | null;
    } | null;
    queriedUserId: string | null;
    guildCount: number;
    uptime: number;
    readyAt: Date | null;
    gatewayPing: number;
}

export class DiscordGeneralService {
    public getMetaQuest(userId?: string): MetaQuestResult {
        try {
            const client = discordClientManager.getClient();
            return {
                clientUser: {
                    id: client.user?.id || null,
                    username: client.user?.username || null,
                    tag: client.user?.tag || null
                },
                queriedUserId: userId || null,
                guildCount: client.guilds?.cache?.size || 0,
                uptime: client.uptime || 0,
                readyAt: client.readyAt || null,
                gatewayPing: client.ws?.ping || -1
            };
        } catch {
            return {
                clientUser: null,
                queriedUserId: userId || null,
                guildCount: 0,
                uptime: 0,
                readyAt: null,
                gatewayPing: -1
            };
        }
    }

    public async massDm(userIds: string[], message: string): Promise<MassDmResult> {
        const uniqueUserIds = Array.from(new Set(userIds));
        const clients = discordClientManager.getConnectedClients();

        if (clients.length === 0) {
            return {
                totalRecipients: uniqueUserIds.length,
                sent: 0,
                failed: uniqueUserIds.length,
                errors: [{ userId: "ALL", reason: "No active Discord clients available" }]
            };
        }

        const result: MassDmResult = { totalRecipients: uniqueUserIds.length, sent: 0, failed: 0, errors: [] };
        const chunks: string[][] = Array.from({ length: clients.length }, () => []);
        uniqueUserIds.forEach((userId, index) => chunks[index % clients.length].push(userId));

        const workers = clients.map(async (client, clientIndex) => {
            for (const userId of chunks[clientIndex]) {
                try {
                    const user = await client.users.fetch(userId).catch(() => null);
                    if (!user) {
                        result.failed += 1;
                        result.errors.push({ userId, reason: "User not found" });
                        continue;
                    }
                    await user.send(message);
                    result.sent += 1;
                    await new Promise((r) => setTimeout(r, 1200));
                } catch (err: unknown) {
                    result.failed += 1;
                    result.errors.push({ userId, reason: err instanceof Error ? err.message : "DM delivery failed" });
                }
            }
        });

        await Promise.all(workers);
        return result;
    }

    public async messageAllServerMembers(serverId: string, message: string): Promise<MassDmResult> {
        const client = discordClientManager.getClientForGuild(serverId);
        if (!client) {
            return { totalRecipients: 0, sent: 0, failed: 0, errors: [{ userId: serverId, reason: "Guild unavailable or not owned by any connected client" }] };
        }

        const guild = client.guilds.cache.get(serverId);
        if (!guild) {
            return { totalRecipients: 0, sent: 0, failed: 0, errors: [{ userId: serverId, reason: "Guild not found or client not in guild" }] };
        }

        return this.massDm(Array.from(guild.members.cache.keys()).filter((id) => id !== client.user?.id), message);
    }
}

export const discordGeneralService = new DiscordGeneralService();
