import { memberIndex } from "../../core/indexes/MemberIndex.js";
import { userGuildIndex } from "../../core/indexes/UserGuildIndex.js";
import { roleIndex } from "../../core/indexes/RoleIndex.js";
import { guildStateManager } from "../../core/state/GuildStateManager.js";
import { QueryContext, ResolvedMemberData } from "./QueryContext.js";
import { ApiResultStatus } from "../../core/indexes/types.js";

export interface RoleInfo {
    id: string;
    name: string;
    color: string;
    position: number;
    permissions: string;
}

export interface GuildRolesResult {
    guildId: string;
    userId: string;
    status: ApiResultStatus;
    roles: RoleInfo[];
    rolesBitfield: string;
    joinedTimestamp: number;
    updatedAt: number;
    dataFreshnessMs: number;
    isComplete: boolean;
}

export interface CheckRolesResponse {
    userId: string;
    status: ApiResultStatus;
    totalGuilds: number;
    guilds: GuildRolesResult[];
    dataFreshnessMs: number;
}

export class CheckRolesService {
    public execute(userId: string, context?: QueryContext): CheckRolesResponse {
        const targetGuilds = userGuildIndex.getGuildsForUser(userId);
        const results: GuildRolesResult[] = [];
        const now = Date.now();

        if (targetGuilds.size === 0) {
            return {
                userId,
                status: "MEMBER_NOT_FOUND",
                totalGuilds: 0,
                guilds: [],
                dataFreshnessMs: 0
            };
        }

        for (const guildId of targetGuilds) {
            if (context && !context.isGuildAuthorized(guildId)) {
                continue;
            }

            const syncMeta = guildStateManager.getSyncStatus(guildId);
            const isComplete = syncMeta.status === "READY";

            let resolved = context?.getResolvedMember(guildId, userId);
            if (!resolved) {
                const member = memberIndex.getMember(guildId, userId);
                if (!member) {
                    results.push({
                        guildId,
                        userId,
                        status: isComplete ? "MEMBER_NOT_FOUND" : "PARTIAL",
                        roles: [],
                        rolesBitfield: "0",
                        joinedTimestamp: 0,
                        updatedAt: 0,
                        dataFreshnessMs: Math.max(0, now - syncMeta.lastSyncedAt),
                        isComplete
                    });
                    continue;
                }

                const resolvedRoles = member.roleIds
                    .map((rId) => roleIndex.getRole(guildId, rId))
                    .filter((r): r is NonNullable<typeof r> => r !== null && !r.deleted);

                let bitmask = 0n;
                try {
                    bitmask = BigInt(member.rolesBitfield || "0");
                } catch {
                    bitmask = 0n;
                }

                resolved = {
                    member,
                    roles: resolvedRoles,
                    effectiveBitmask: bitmask,
                    syncMeta
                };

                if (context) {
                    context.setResolvedMember(guildId, userId, resolved);
                }
            }

            const roleInfos: RoleInfo[] = resolved.roles.map((r) => ({
                id: r.roleId,
                name: r.name,
                color: r.color,
                position: r.position,
                permissions: r.permissions
            }));

            results.push({
                guildId,
                userId,
                status: isComplete ? "MEMBER_FOUND" : "PARTIAL",
                roles: roleInfos,
                rolesBitfield: resolved.member.rolesBitfield,
                joinedTimestamp: resolved.member.joinedTimestamp,
                updatedAt: resolved.member.updatedAt,
                dataFreshnessMs: Math.max(0, now - resolved.member.updatedAt),
                isComplete
            });
        }

        const overallStatus: ApiResultStatus = results.length === 0
            ? "NOT_AUTHORIZED"
            : results.some((r) => r.status === "MEMBER_FOUND")
                ? "MEMBER_FOUND"
                : "PARTIAL";

        return {
            userId,
            status: overallStatus,
            totalGuilds: results.length,
            guilds: results,
            dataFreshnessMs: 0
        };
    }
}

export const checkRolesService = new CheckRolesService();
