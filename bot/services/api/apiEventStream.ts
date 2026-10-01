import fs from 'fs';
import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { logger } from '../../utils/logger/logger';
import { invalidateApiCache } from './apiService';
import {
    WsEventType,
    WsMessage,
    WsCacheInvalidatePayload,
    WsVoiceUpdatePayload,
    WsRoleAlertPayload,
    WsDangerAlertPayload
} from '../../types/apiContracts';

const SOCKET_PATH = process.env.API_SOCKET_PATH || '/dev/shm/3p6_api.sock';
const BASE_URL_RAW = (process.env.API_ENDPOINT || process.env.API_BASE_URL || 'http://127.0.0.1:3116').replace(/\/+$/, '');
const API_KEY = process.env.API_KEY || process.env.API_SECRET_KEY || '';

class ApiEventStream extends EventEmitter {
    private ws: WebSocket | null = null;
    private reconnectTimer: NodeJS.Timeout | null = null;
    private reconnectDelay = 1000;
    private maxReconnectDelay = 15000;
    private isIntentionallyClosed = false;
    private pingInterval: NodeJS.Timeout | null = null;

    private getWsUrl(): string {
        let parsed: URL;
        try {
            parsed = new URL(BASE_URL_RAW);
        } catch {
            parsed = new URL('http://127.0.0.1:3116');
        }

        const protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = parsed.host;
        return `${protocol}//${host}/ws/events?key=${encodeURIComponent(API_KEY)}`;
    }

    public connect(): void {
        this.isIntentionallyClosed = false;
        this.cleanup();

        const useSocket = fs.existsSync(SOCKET_PATH);
        const wsUrl = useSocket
            ? `ws+unix://${SOCKET_PATH}:/ws/events?key=${encodeURIComponent(API_KEY)}`
            : this.getWsUrl();

        const wsOptions: WebSocket.ClientOptions = {
            headers: {
                'x-api-key': API_KEY,
            },
            handshakeTimeout: 5000,
        };

        logger.info(`[ApiEventStream] Connecting to WebSocket event stream (${useSocket ? `Unix Socket: ${SOCKET_PATH}` : wsUrl.replace(/key=([^&]+)/, 'key=***')})`);

        try {
            this.ws = new WebSocket(wsUrl, wsOptions);

            this.ws.on('open', () => {
                logger.info('[ApiEventStream] Connected to API WebSocket event stream successfully.');
                this.reconnectDelay = 1000;
                this.startHeartbeat();
                this.emit('connected');
            });

            this.ws.on('message', (raw: WebSocket.RawData) => {
                this.handleIncomingMessage(raw);
            });

            this.ws.on('close', (code, reason) => {
                logger.warn(`[ApiEventStream] WebSocket closed (code: ${code}, reason: ${reason.toString() || 'none'})`);
                this.stopHeartbeat();
                this.emit('disconnected', code, reason);
                this.scheduleReconnect();
            });

            this.ws.on('error', (error) => {
                logger.error('[ApiEventStream] WebSocket connection error:', error.message || error);
            });
        } catch (err: any) {
            logger.error('[ApiEventStream] Error creating WebSocket instance:', err);
            this.scheduleReconnect();
        }
    }

    private handleIncomingMessage(raw: WebSocket.RawData): void {
        try {
            const message: WsMessage = JSON.parse(raw.toString());

            if (message.type === 'PING') {
                this.send('PONG', {});
                return;
            }

            if (message.type === 'CACHE_INVALIDATE') {
                const payload = message.payload as WsCacheInvalidatePayload;
                if (payload?.path) {
                    invalidateApiCache(payload.path);
                }
            }

            if (message.type === 'VOICE_UPDATE') {
                const payload = message.payload as WsVoiceUpdatePayload;
                if (payload?.userId) {
                    invalidateApiCache(`/api/user-voice/${payload.userId}`);
                }
            }

            if (message.type === 'ROLE_ALERT') {
                const payload = message.payload as WsRoleAlertPayload;
                if (payload?.userId) {
                    invalidateApiCache(`/api/user-roles/${payload.userId}`);
                    invalidateApiCache(`/api/danger-roles/${payload.userId}`);
                }
            }

            if (message.type === 'DANGER_ALERT') {
                const payload = message.payload as WsDangerAlertPayload;
                if (payload?.userId) {
                    invalidateApiCache(`/api/danger-roles/${payload.userId}`);
                }
            }

            this.emit(message.type, message.payload, message.timestamp);
            this.emit('message', message);
        } catch (e: any) {
            logger.warn(`[ApiEventStream] Malformed WebSocket message received: ${e?.message || e}`);
        }
    }

    public send<T = unknown>(type: WsEventType, payload: T): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const frame: WsMessage<T> = {
                type,
                payload,
                timestamp: Date.now(),
            };
            this.ws.send(JSON.stringify(frame));
        }
    }

    private startHeartbeat(): void {
        this.stopHeartbeat();
        this.pingInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.send('PING', {});
            }
        }, 30000);
    }

    private stopHeartbeat(): void {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    private scheduleReconnect(): void {
        if (this.isIntentionallyClosed) return;
        if (this.reconnectTimer) return;

        logger.info(`[ApiEventStream] Reconnecting in ${this.reconnectDelay / 1000}s...`);
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
        }, this.reconnectDelay);

        this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
    }

    private cleanup(): void {
        this.stopHeartbeat();
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.ws) {
            this.ws.removeAllListeners();
            if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
                this.ws.terminate();
            }
            this.ws = null;
        }
    }

    public disconnect(): void {
        this.isIntentionallyClosed = true;
        this.cleanup();
        logger.info('[ApiEventStream] Disconnected cleanly');
    }

    public isConnected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }
}

export const apiEventStream = new ApiEventStream();
