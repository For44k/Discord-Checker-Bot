import { Server as HttpServer, IncomingMessage } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { URL } from "url";
import { config } from "../utils/env.config.js";
import { WsEventType, WsMessage } from "../types/apiContracts.js";

interface ExtWebSocket extends WebSocket {
    isAlive?: boolean;
}

export class EventBroadcaster {
    private wss: WebSocketServer | null = null;
    private clients: Set<ExtWebSocket> = new Set();
    private heartbeatInterval: NodeJS.Timeout | null = null;

    public init(server: HttpServer): void {
        if (this.wss) return;

        this.wss = new WebSocketServer({
            server,
            path: "/ws/events",
            verifyClient: (info: { req: IncomingMessage }, callback: (res: boolean, code?: number, message?: string) => void) => {
                const req = info.req;
                const apiKey = this.extractApiKey(req);

                if (!config.API_KEY || apiKey === config.API_KEY) {
                    callback(true);
                } else {
                    console.warn(`[WebSocket] Unauthorized connection attempt from ${req.socket.remoteAddress}`);
                    callback(false, 401, "Unauthorized: Invalid API Key");
                }
            }
        });

        this.wss.on("connection", (rawWs: WebSocket, req: IncomingMessage) => {
            const ws = rawWs as ExtWebSocket;
            const clientIp = req.socket.remoteAddress;
            console.log(`[WebSocket] Client connected from ${clientIp} (Total clients: ${this.clients.size + 1})`);

            ws.isAlive = true;
            this.clients.add(ws);

            ws.on("pong", () => {
                ws.isAlive = true;
            });

            ws.on("message", (raw: Buffer | string) => {
                try {
                    const parsed = JSON.parse(raw.toString()) as { type?: string };
                    if (parsed?.type === "PING") {
                        ws.send(JSON.stringify({ type: "PONG", payload: {}, timestamp: Date.now() }));
                    }
                } catch {}
            });

            ws.on("close", (code, reason) => {
                this.clients.delete(ws);
                console.log(`[WebSocket] Client disconnected (code: ${code}, reason: ${reason || "none"}, Total clients: ${this.clients.size})`);
            });

            ws.on("error", (err) => {
                console.error("[WebSocket] Client socket error:", err);
                this.clients.delete(ws);
            });

            const welcomeMsg: WsMessage<{ status: string }> = {
                type: "PING",
                payload: { status: "connected" },
                timestamp: Date.now()
            };
            ws.send(JSON.stringify(welcomeMsg));
        });

        this.heartbeatInterval = setInterval(() => {
            for (const ws of this.clients) {
                if (ws.isAlive === false) {
                    this.clients.delete(ws);
                    ws.terminate();
                    continue;
                }
                ws.isAlive = false;
                ws.ping();
            }
        }, 30000);

        console.log("[WebSocket] EventBroadcaster initialized on path /ws/events");
    }

    private extractApiKey(req: IncomingMessage): string {
        const headerKey = req.headers["x-api-key"] || req.headers["authorization"];
        if (typeof headerKey === "string") {
            return headerKey.replace(/^Bearer\s+/i, "").trim();
        }

        try {
            const parsedUrl = new URL(req.url || "", "http://localhost");
            return parsedUrl.searchParams.get("key") || parsedUrl.searchParams.get("apiKey") || "";
        } catch {
            return "";
        }
    }

    public broadcast<T = unknown>(type: WsEventType, payload: T): void {
        if (!this.wss || this.clients.size === 0) return;

        const message: WsMessage<T> = {
            type,
            payload,
            timestamp: Date.now()
        };

        const serialized = JSON.stringify(message);

        for (const client of this.clients) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(serialized, (err) => {
                    if (err) {
                        console.error("[WebSocket] Error sending frame to client:", err);
                    }
                });
            }
        }
    }

    public async close(): Promise<void> {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }

        if (this.wss) {
            for (const client of this.clients) {
                client.terminate();
            }
            this.clients.clear();
            await new Promise<void>((resolve) => {
                this.wss?.close(() => resolve());
            });
            this.wss = null;
            console.log("[WebSocket] EventBroadcaster closed cleanly");
        }
    }

    public getClientCount(): number {
        return this.clients.size;
    }
}

export const eventBroadcaster = new EventBroadcaster();
