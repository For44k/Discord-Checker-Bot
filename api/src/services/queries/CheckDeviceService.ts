import { presenceIndex } from "../../core/indexes/PresenceIndex.js";
import { QueryContext } from "./QueryContext.js";
import { ApiResultStatus, ClientPlatformStatus } from "../../core/indexes/types.js";

export interface DevicePlatforms {
    desktop: ClientPlatformStatus;
    mobile: ClientPlatformStatus;
    web: ClientPlatformStatus;
}

export interface CheckDeviceResponse {
    userId: string;
    status: ApiResultStatus;
    observedStatus: ClientPlatformStatus;
    platforms: DevicePlatforms;
    lastObservedAt: number;
    isAvailable: boolean;
}

export class CheckDeviceService {
    public execute(userId: string, context?: QueryContext): CheckDeviceResponse {
        let presence = context?.getPresence(userId);
        if (presence === undefined) {
            presence = presenceIndex.getPresence(userId);
            if (context) {
                context.setPresence(userId, presence);
            }
        }

        if (!presence) {
            return {
                userId,
                status: "UNAVAILABLE",
                observedStatus: "unknown",
                platforms: {
                    desktop: "unknown",
                    mobile: "unknown",
                    web: "unknown"
                },
                lastObservedAt: 0,
                isAvailable: false
            };
        }

        return {
            userId,
            status: "MEMBER_FOUND",
            observedStatus: presence.status,
            platforms: {
                desktop: presence.desktop,
                mobile: presence.mobile,
                web: presence.web
            },
            lastObservedAt: presence.lastObservedAt,
            isAvailable: true
        };
    }
}

export const checkDeviceService = new CheckDeviceService();
