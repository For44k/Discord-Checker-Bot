import fs from "fs";
import http from "http";
import https from "https";
import { FastCache } from "../../cache/fastCache";
import {
    UserRolesResponse,
    DangerRolesResponse,
    UserVoiceResponse,
    VoiceLeaderboardResponse,
    ServerInfoResponse,
    ServerAdminsResponse,
    ServerBotsResponse,
    ServerRolesResponse,
    ServerEmojisResponse,
    ServerStickersResponse,
    ServerLogsResponse,
    SocialShipResponse,
    UserPresenceResponse,
} from "../../types/apiContracts";

const SOCKET_PATH = process.env.API_SOCKET_PATH || "/dev/shm/3p6_api.sock";
const BASE_URL_RAW = (process.env.API_ENDPOINT || process.env.API_BASE_URL || "http://127.0.0.1:3116").replace(/\/+$/, "");
const API_KEY = process.env.API_KEY || process.env.API_SECRET_KEY || "";

let parsedBase: URL;
try {
    parsedBase = new URL(BASE_URL_RAW);
} catch {
    parsedBase = new URL("http://127.0.0.1:3116");
}

const isHttps = parsedBase.protocol === "https:";
const API_HOST = parsedBase.hostname;
const API_PORT = Number(parsedBase.port) || (isHttps ? 443 : 80);

const socketAgent = new http.Agent({
    keepAlive: true,
    keepAliveMsecs: 120000,
    maxSockets: 2000,
    maxFreeSockets: 500,
    timeout: 5000,
    scheduling: "lifo",
});

const httpAgent = new http.Agent({
    keepAlive: true,
    keepAliveMsecs: 120000,
    maxSockets: 2000,
    maxFreeSockets: 500,
    timeout: 5000,
    scheduling: "lifo",
});

const httpsAgent = new https.Agent({
    keepAlive: true,
    keepAliveMsecs: 120000,
    maxSockets: 2000,
    maxFreeSockets: 500,
    timeout: 5000,
    scheduling: "lifo",
});

const responseCache = new FastCache<unknown>(30000, 10000);
const inFlightRequests = new Map<string, Promise<unknown>>();

const USE_SOCKET = fs.existsSync(SOCKET_PATH);

function rawRequest(method: "GET" | "POST", fullPath: string, payload?: string): Promise<unknown> {
    return new Promise((resolve, reject) => {
        const pathWithSlash = fullPath.startsWith("/") ? fullPath : "/" + fullPath;
        const useSocket = USE_SOCKET;

        const options: http.RequestOptions = useSocket
            ? {
                socketPath: SOCKET_PATH,
                path: pathWithSlash,
                method,
                agent: socketAgent,
                headers: {
                    "Accept": "application/json",
                    "x-api-key": API_KEY,
                    ...(payload ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } : {}),
                },
            }
            : {
                hostname: API_HOST,
                port: API_PORT,
                path: pathWithSlash,
                method,
                agent: isHttps ? httpsAgent : httpAgent,
                headers: {
                    "Accept": "application/json",
                    "x-api-key": API_KEY,
                    ...(payload ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } : {}),
                },
            };

        const clientModule = (!useSocket && isHttps) ? https : http;
        const req = (clientModule as typeof http).request(options, (res: http.IncomingMessage) => {
            const chunks: Buffer[] = [];
            res.on("data", (chunk: Buffer) => chunks.push(chunk));
            res.on("end", () => {
                if (res.statusCode && res.statusCode >= 400) {
                    return reject(new Error(`HTTP ${res.statusCode}`));
                }
                try {
                    const raw = Buffer.concat(chunks).toString("utf8");
                    resolve(JSON.parse(raw));
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.setNoDelay(true);
        req.setSocketKeepAlive(true, 120000);

        req.setTimeout(5000, () => {
            req.destroy();
            reject(new Error("Timeout"));
        });

        req.on("error", reject);
        if (payload) req.write(payload);
        req.end();
    });
}

export async function apiGet<T = unknown>(path: string, _retries: number = 0, useCache: boolean = true): Promise<T> {
    const fullPath = path.startsWith("/") ? path : `/${path}`;

    if (useCache) {
        const hit = responseCache.get(fullPath);
        if (hit !== undefined) return hit as T;
    }

    const existing = inFlightRequests.get(fullPath);
    if (existing) {
        return existing as Promise<T>;
    }

    const requestPromise = rawRequest("GET", fullPath)
        .then((result) => {
            if (useCache && result) responseCache.set(fullPath, result);
            return result as T;
        })
        .finally(() => {
            inFlightRequests.delete(fullPath);
        });

    inFlightRequests.set(fullPath, requestPromise);
    return requestPromise;
}

export async function apiPost<T = unknown>(path: string, body: unknown): Promise<T> {
    const fullPath = path.startsWith("/") ? path : `/${path}`;
    return rawRequest("POST", fullPath, JSON.stringify(body)) as Promise<T>;
}

export function invalidateApiCache(path: string): void {
    const fullPath = path.startsWith("/") ? path : `/${path}`;
    responseCache.delete(fullPath);
    inFlightRequests.delete(fullPath);
}

export async function fetchUserRoles(userId: string, useCache = true): Promise<UserRolesResponse> {
    return apiGet<UserRolesResponse>(`/api/user-roles/${userId}`, 0, useCache);
}

export async function fetchDangerRoles(userId: string, useCache = true): Promise<DangerRolesResponse> {
    return apiGet<DangerRolesResponse>(`/api/danger-roles/${userId}`, 0, useCache);
}

export async function fetchUserVoice(userId: string, useCache = true): Promise<UserVoiceResponse> {
    return apiGet<UserVoiceResponse>(`/api/user-voice/${userId}`, 0, useCache);
}

export async function fetchVoiceLeaderboard(guildId?: string, limit = 100, useCache = true): Promise<VoiceLeaderboardResponse> {
    const endpoint = guildId ? `/api/voice-leaderboard/${guildId}?limit=${limit}` : `/api/voice-leaderboard?limit=${limit}`;
    return apiGet<VoiceLeaderboardResponse>(endpoint, 0, useCache);
}

export async function fetchServerInfo(serverId: string, useCache = true): Promise<ServerInfoResponse> {
    return apiGet<ServerInfoResponse>(`/api/server-info/${serverId}`, 0, useCache);
}

export async function fetchServerAdmins(serverId: string, useCache = true): Promise<ServerAdminsResponse> {
    return apiGet<ServerAdminsResponse>(`/api/server-admins/${serverId}`, 0, useCache);
}

export async function fetchServerBots(serverId: string, useCache = true): Promise<ServerBotsResponse> {
    return apiGet<ServerBotsResponse>(`/api/server-bots/${serverId}`, 0, useCache);
}

export async function fetchServerRoles(serverId: string, useCache = true): Promise<ServerRolesResponse> {
    return apiGet<ServerRolesResponse>(`/api/server-roles-icons/${serverId}`, 0, useCache);
}

export async function fetchServerEmojis(serverId: string, useCache = true): Promise<ServerEmojisResponse> {
    return apiGet<ServerEmojisResponse>(`/api/server-emojis/${serverId}`, 0, useCache);
}

export async function fetchServerStickers(serverId: string, useCache = true): Promise<ServerStickersResponse> {
    return apiGet<ServerStickersResponse>(`/api/server-stickers/${serverId}`, 0, useCache);
}

export async function fetchServerLogs(serverId?: string, useCache = true): Promise<ServerLogsResponse> {
    const endpoint = serverId ? `/api/server-logs/${serverId}` : `/api/all-server-logs`;
    return apiGet<ServerLogsResponse>(endpoint, 0, useCache);
}

export async function fetchSocialShip(user1Id: string, user2Id: string, useCache = true): Promise<SocialShipResponse> {
    return apiGet<SocialShipResponse>(`/api/social-ship?user1Id=${user1Id}&user2Id=${user2Id}`, 0, useCache);
}

export async function fetchUserPresence(userId: string, useCache = true): Promise<UserPresenceResponse> {
    return apiGet<UserPresenceResponse>(`/api/user-presence/${userId}`, 0, useCache);
}

export async function fetchUserDevice(userId: string, useCache = true): Promise<any> {
    return apiGet<any>(`/api/user-device/${userId}`, 0, useCache);
}
