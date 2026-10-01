import { Client, User } from "discord.js-selfbot-v13";
import { config } from "../../utils/env.config.js";
import { registerClientEvents } from "./clientEvents.js";
import { guildOwnershipManager } from "./guildOwnership.js";
import { memberIndex, computePermissionsBitmask } from "../../cache/MemberIndex.js";
import { stateStore } from "../../state/StateStore.js";
import { voiceSessionRepository } from "../../database/repositories/VoiceSessionRepository.js";
import { IVoiceSession } from "../../database/models/VoiceSession.js";

interface DiscordClientInstance {
    client: Client;
    token: string;
    isReady: boolean;
    cooldownUntil: number;
    disconnectedAt?: number;
}

export class DiscordClientManager {
    private clients: Map<string, DiscordClientInstance> = new Map();
    private roundRobinIndex = 0;

    constructor() {
        this.initializeClients();
    }

    private initializeClients(): void {
        const tokens = config.DISCORD_USER_TOKENS;
        if (tokens.length === 0) {
            console.warn("[API Selfbot] No Discord user tokens configured");
            return;
        }

        for (const token of tokens) {
            const client = new Client();
            this.setupEventHandlers(client, token);
            registerClientEvents(client);
            this.clients.set(token, { client, token, isReady: false, cooldownUntil: 0 });
        }
    }

    private setupEventHandlers(client: Client, token: string): void {
        client.on("ready", async () => {
            const instance = this.clients.get(token);
            if (instance) instance.isReady = true;
            const userCount = client.guilds.cache.reduce((total, guild) => total + guild.memberCount, 0);
            console.log(`[API Selfbot] Logged in as ${client.user?.tag} (${client.user?.id}) | Guilds: ${client.guilds.cache.size} | Users: ${userCount} | Token: ${token.substring(0, 10)}...`);
        });

        client.on("shardDisconnect", async () => {
            const now = Date.now();
            const instance = this.clients.get(token);
            if (instance) {
                instance.isReady = false;
                instance.disconnectedAt = now;
            }

            const clientId = client.user?.id;
            if (!clientId) return;

            const releasedGuilds = guildOwnershipManager.releaseAllForClient(clientId);
            console.warn(`[API Selfbot] Shard disconnected for ${client.user?.tag || token.substring(0, 10)} - released ${releasedGuilds.length} owned guilds`);

            const healthyClients = this.getConnectedClients().filter((c) => c.user?.id !== clientId);
            for (const guildId of releasedGuilds) {
                for (const candidate of healthyClients) {
                    const candidateId = candidate.user?.id;
                    if (candidateId && candidate.guilds.cache.has(guildId)) {
                        if (guildOwnershipManager.claim(guildId, candidateId)) {
                            console.log(`[API Selfbot] Guild ${guildId} failed over to ${candidate.user?.tag}`);
                            const guild = candidate.guilds.cache.get(guildId);
                            if (guild) {
                                for (const member of guild.members.cache.values()) {
                                    memberIndex.setMember({
                                        id: member.id,
                                        guildId: guild.id,
                                        rolesBitfield: computePermissionsBitmask(member).toString(),
                                        joinedTimestamp: member.joinedTimestamp || Date.now()
                                    });
                                }
                                if (guild.voiceStates?.cache) {
                                    const dbSessions = await voiceSessionRepository.getGuildActiveSessions(guild.id).catch(() => []);
                                    const dbSessionMap = new Map<string, IVoiceSession>();
                                    for (const s of dbSessions) {
                                        if (s?.userId) dbSessionMap.set(s.userId, s);
                                    }
                                    for (const [userId, vs] of guild.voiceStates.cache) {
                                        if (vs.channelId) {
                                            const existingDb = dbSessionMap.get(userId);
                                            const startedAt = existingDb?.startedAt ? new Date(existingDb.startedAt).getTime() : undefined;
                                            stateStore.recordVoiceUpdate(userId, guild.id, vs.channelId, startedAt);
                                        }
                                    }
                                }
                            }
                            break;
                        }
                    }
                }
            }
        });

        client.on("shardResume", async () => {
            const now = Date.now();
            const instance = this.clients.get(token);
            const disconnectedAt = instance?.disconnectedAt;
            if (instance) {
                instance.isReady = true;
                instance.disconnectedAt = undefined;
            }
            stateStore.reconcileActiveSessions(now, disconnectedAt);
            console.log(`[API Selfbot] Shard resumed for token ${token.substring(0, 10)}...`);
        });

        client.on("error", (error) => {
            console.error(`[API Selfbot] Client error for token ${token.substring(0, 10)}...:`, error);
        });
    }

    public async start(): Promise<void> {
        if (this.clients.size === 0) throw new Error("No Discord user tokens configured");

        await Promise.all(
            Array.from(this.clients.entries()).map(async ([token, instance]) => {
                try {
                    await instance.client.login(token);
                } catch (error) {
                    console.error(`[API Selfbot] Failed to login token ${token.substring(0, 10)}...:`, error);
                }
            })
        );

        const connectedCount = this.getConnectedClients().length;
        if (connectedCount === 0) throw new Error("All Discord selfbot tokens failed to connect");
        console.log(`[API Selfbot] Successfully initialized ${connectedCount}/${this.clients.size} clients`);
    }

    public async stop(): Promise<void> {
        for (const instance of this.clients.values()) {
            instance.client.destroy();
            instance.isReady = false;
        }
    }

    public isConnected(): boolean {
        return Array.from(this.clients.values()).some((instance) => instance.isReady);
    }

    public getClient(): Client {
        for (const instance of this.clients.values()) {
            if (instance.isReady && instance.client.user) return instance.client;
        }
        const first = this.clients.values().next().value;
        if (!first) throw new Error("No Discord clients configured");
        return first.client;
    }

    public getRoundRobinClient(): Client | null {
        const available = this.getAvailableClients();
        const pool = available.length > 0 ? available : this.getConnectedClients();
        if (pool.length === 0) return null;
        const selected = pool[this.roundRobinIndex % pool.length];
        this.roundRobinIndex = (this.roundRobinIndex + 1) % pool.length;
        return selected;
    }

    public getClientForGuild(guildId: string): Client | null {
        for (const instance of this.clients.values()) {
            if (instance.isReady && instance.client.guilds.cache.has(guildId)) return instance.client;
        }
        return null;
    }

    public getAllClients(): Client[] {
        return Array.from(this.clients.values()).map((instance) => instance.client);
    }

    public getConnectedClients(): Client[] {
        return Array.from(this.clients.values())
            .filter((instance) => instance.isReady && Boolean(instance.client.user))
            .map((instance) => instance.client);
    }

    public getAvailableClients(): Client[] {
        const now = Date.now();
        return Array.from(this.clients.values())
            .filter((instance) => instance.isReady && Boolean(instance.client.user) && now >= instance.cooldownUntil)
            .map((instance) => instance.client);
    }

    public markTokenThrottled(client: Client, retryAfterMs = 5000): void {
        for (const instance of this.clients.values()) {
            if (instance.client === client) {
                instance.cooldownUntil = Date.now() + Math.max(retryAfterMs, 1000);
                console.warn(`[API Selfbot] Token ${instance.token.substring(0, 10)}... throttled for ${retryAfterMs}ms`);
                break;
            }
        }
    }

    public async executeWithFailover<T>(operation: (client: Client) => Promise<T>): Promise<T | null> {
        const available = this.getAvailableClients();
        const connected = available.length > 0 ? available : this.getConnectedClients();
        if (connected.length === 0) return null;

        const startIndex = this.roundRobinIndex % connected.length;
        this.roundRobinIndex = (this.roundRobinIndex + 1) % connected.length;

        for (let i = 0; i < connected.length; i++) {
            const client = connected[(startIndex + i) % connected.length];
            try {
                return await operation(client);
            } catch (err: unknown) {
                const errObj = err as { status?: number; httpStatus?: number; code?: number; retry_after?: number };
                const status = errObj?.status || errObj?.httpStatus || errObj?.code;
                if (status === 429) {
                    const retryAfter = errObj?.retry_after ? errObj.retry_after * 1000 : 5000;
                    this.markTokenThrottled(client, retryAfter);
                    console.warn(`[API Selfbot] Throttled on ${client.user?.tag}, failing over...`);
                    continue;
                }
                throw err;
            }
        }

        return null;
    }

    public async fetchUsersParallel(userIds: string[]): Promise<Map<string, User>> {
        const connected = this.getConnectedClients();
        const resultMap = new Map<string, User>();
        if (connected.length === 0 || userIds.length === 0) return resultMap;

        const chunks: string[][] = Array.from({ length: connected.length }, () => []);
        userIds.forEach((id, index) => chunks[index % connected.length].push(id));

        await Promise.all(
            chunks.map(async (chunkIds, clientIndex) => {
                const client = connected[clientIndex];
                for (const uid of chunkIds) {
                    try {
                        const user = client.users.cache.get(uid) || (await client.users.fetch(uid));
                        if (user) resultMap.set(uid, user);
                    } catch {}
                }
            })
        );

        return resultMap;
    }
}

export const discordClientManager = new DiscordClientManager();
