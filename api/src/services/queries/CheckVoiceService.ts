import { voiceIndex } from "../../core/indexes/VoiceIndex.js";
import { userVoiceIndex } from "../../core/indexes/UserVoiceIndex.js";
import { guildStateManager } from "../../core/state/GuildStateManager.js";
import { QueryContext } from "./QueryContext.js";
import { ApiResultStatus } from "../../core/indexes/types.js";

export interface VoiceChannelState {
    guildId: string;
    userId: string;
    channelId: string;
    observedJoinedAt: number;
    selfMute: boolean;
    selfDeaf: boolean;
    serverMute: boolean;
    serverDeaf: boolean;
    selfVideo: boolean;
    selfStream: boolean;
    updatedAt: number;
    dataFreshnessMs: number;
    status: ApiResultStatus;
}

export interface CheckVoiceResponse {
    userId: string;
    isConnected: boolean;
    totalConnections: number;
    status: ApiResultStatus;
    connections: VoiceChannelState[];
}

export class CheckVoiceService {
    public execute(userId: string, context?: QueryContext): CheckVoiceResponse {
        const targetGuilds = userVoiceIndex.getGuildsForUser(userId);
        const connections: VoiceChannelState[] = [];
        const now = Date.now();

        for (const guildId of targetGuilds) {
            if (context && !context.isGuildAuthorized(guildId)) {
                continue;
            }

            let voiceRecord = context?.getVoiceRecord(guildId, userId);
            if (voiceRecord === undefined) {
                voiceRecord = voiceIndex.getVoiceState(guildId, userId);
                if (context) {
                    context.setVoiceRecord(guildId, userId, voiceRecord);
                }
            }

            if (!voiceRecord) {
                continue;
            }

            const syncMeta = guildStateManager.getSyncStatus(guildId);
            const isComplete = syncMeta.status === "READY";

            connections.push({
                guildId: voiceRecord.guildId,
                userId: voiceRecord.userId,
                channelId: voiceRecord.channelId,
                observedJoinedAt: voiceRecord.observedJoinedAt,
                selfMute: voiceRecord.selfMute,
                selfDeaf: voiceRecord.selfDeaf,
                serverMute: voiceRecord.serverMute,
                serverDeaf: voiceRecord.serverDeaf,
                selfVideo: voiceRecord.selfVideo,
                selfStream: voiceRecord.selfStream,
                updatedAt: voiceRecord.updatedAt,
                dataFreshnessMs: Math.max(0, now - voiceRecord.updatedAt),
                status: isComplete ? "MEMBER_FOUND" : "PARTIAL"
            });
        }

        const isConnected = connections.length > 0;
        const overallStatus: ApiResultStatus = isConnected
            ? "MEMBER_FOUND"
            : targetGuilds.size > 0
                ? "NOT_AUTHORIZED"
                : "MEMBER_NOT_FOUND";

        return {
            userId,
            isConnected,
            totalConnections: connections.length,
            status: overallStatus,
            connections
        };
    }
}

export const checkVoiceService = new CheckVoiceService();
