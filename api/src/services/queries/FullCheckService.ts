import { QueryContext } from "./QueryContext.js";
import { checkRolesService, CheckRolesResponse } from "./CheckRolesService.js";
import { dangerRolesService, DangerRolesResponse } from "./DangerRolesService.js";
import { checkVoiceService, CheckVoiceResponse } from "./CheckVoiceService.js";
import { checkDeviceService, CheckDeviceResponse } from "./CheckDeviceService.js";
import { checkConnectionsService, CheckConnectionsResponse } from "./CheckConnectionsService.js";
import { ApiResultStatus } from "../../core/indexes/types.js";

export interface FullCheckResponse {
    userId: string;
    status: ApiResultStatus;
    capturedAt: number;
    rolesSection: CheckRolesResponse;
    dangerSection: DangerRolesResponse;
    voiceSection: CheckVoiceResponse;
    deviceSection: CheckDeviceResponse;
    connectionsSection: CheckConnectionsResponse;
}

export class FullCheckService {
    public execute(
        userId: string,
        requesterId: string = "system",
        authorizedGuildIds: Set<string> | null = null,
        isRequesterAuthorizedForConnections: boolean = false,
        ownerGuildIds: Set<string> = new Set()
    ): FullCheckResponse {
        const requestId = `${userId}-${Date.now()}`;
        const context = new QueryContext(requestId, requesterId, authorizedGuildIds);

        const rolesSection = checkRolesService.execute(userId, context);
        const dangerSection = dangerRolesService.execute(userId, context, ownerGuildIds);
        const voiceSection = checkVoiceService.execute(userId, context);
        const deviceSection = checkDeviceService.execute(userId, context);
        const connectionsSection = checkConnectionsService.execute(userId, isRequesterAuthorizedForConnections);

        let overallStatus: ApiResultStatus = "MEMBER_NOT_FOUND";
        if (rolesSection.status === "MEMBER_FOUND" || voiceSection.status === "MEMBER_FOUND") {
            overallStatus = "MEMBER_FOUND";
        } else if (rolesSection.status === "PARTIAL" || voiceSection.status === "PARTIAL") {
            overallStatus = "PARTIAL";
        } else if (rolesSection.status === "NOT_AUTHORIZED") {
            overallStatus = "NOT_AUTHORIZED";
        }

        return {
            userId,
            status: overallStatus,
            capturedAt: Date.now(),
            rolesSection,
            dangerSection,
            voiceSection,
            deviceSection,
            connectionsSection
        };
    }
}

export const fullCheckService = new FullCheckService();
