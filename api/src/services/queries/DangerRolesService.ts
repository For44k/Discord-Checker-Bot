import { memberIndex } from "../../core/indexes/MemberIndex.js";
import { userGuildIndex } from "../../core/indexes/UserGuildIndex.js";
import { roleIndex } from "../../core/indexes/RoleIndex.js";
import { guildStateManager } from "../../core/state/GuildStateManager.js";
import { QueryContext } from "./QueryContext.js";
import { ApiResultStatus } from "../../core/indexes/types.js";

export interface DangerousPermissionFlag {
    name: string;
    flag: string;
    bitfield: string;
}

export const SENSITIVE_PERMISSIONS: Record<string, bigint> = {
    Administrator: 8n,
    ManageGuild: 32n,
    ManageRoles: 268435456n,
    ManageChannels: 16n,
    ManageWebhooks: 536870912n,
    BanMembers: 4n,
    KickMembers: 2n,
    ModerateMembers: 1099511627776n,
    ManageMessages: 8192n,
    MentionEveryone: 131072n
};

export interface DangerRoleDetail {
    roleId: string;
    roleName: string;
    color: string;
    position: number;
    permissions: string;
    dangerousPermissions: string[];
}

export interface GuildDangerResult {
    guildId: string;
    userId: string;
    status: ApiResultStatus;
    isOwner: boolean;
    isAdmin: boolean;
    highestPermission: string;
    dangerousRoles: DangerRoleDetail[];
    effectiveDangerousPermissions: string[];
    isComplete: boolean;
}

export interface DangerRolesResponse {
    userId: string;
    status: ApiResultStatus;
    totalGuilds: number;
    hasDangerousPermissions: boolean;
    guilds: GuildDangerResult[];
}

export class DangerRolesService {
    public execute(userId: string, context?: QueryContext, ownerGuildIds: Set<string> = new Set()): DangerRolesResponse {
        const targetGuilds = userGuildIndex.getGuildsForUser(userId);
        const results: GuildDangerResult[] = [];
        let anyDangerous = false;

        if (targetGuilds.size === 0) {
            return {
                userId,
                status: "MEMBER_NOT_FOUND",
                totalGuilds: 0,
                hasDangerousPermissions: false,
                guilds: []
            };
        }

        for (const guildId of targetGuilds) {
            if (context && !context.isGuildAuthorized(guildId)) {
                continue;
            }

            const syncMeta = guildStateManager.getSyncStatus(guildId);
            const isComplete = syncMeta.status === "READY";
            const isOwner = ownerGuildIds.has(guildId);

            let resolved = context?.getResolvedMember(guildId, userId);
            if (!resolved) {
                const member = memberIndex.getMember(guildId, userId);
                if (!member) {
                    results.push({
                        guildId,
                        userId,
                        status: isComplete ? "MEMBER_NOT_FOUND" : "PARTIAL",
                        isOwner,
                        isAdmin: isOwner,
                        highestPermission: isOwner ? "Owner" : "None",
                        dangerousRoles: [],
                        effectiveDangerousPermissions: isOwner ? Object.keys(SENSITIVE_PERMISSIONS) : [],
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

            let combinedBitmask = resolved.effectiveBitmask;
            const dangerousRoles: DangerRoleDetail[] = [];

            for (const role of resolved.roles) {
                let roleBitmask = 0n;
                try {
                    roleBitmask = BigInt(role.permissions || "0");
                } catch {
                    roleBitmask = 0n;
                }
                combinedBitmask |= roleBitmask;

                const roleDangerousPerms: string[] = [];
                for (const [permName, permBit] of Object.entries(SENSITIVE_PERMISSIONS)) {
                    if ((roleBitmask & permBit) === permBit) {
                        roleDangerousPerms.push(permName);
                    }
                }

                if (roleDangerousPerms.length > 0) {
                    dangerousRoles.push({
                        roleId: role.roleId,
                        roleName: role.name,
                        color: role.color,
                        position: role.position,
                        permissions: role.permissions,
                        dangerousPermissions: roleDangerousPerms
                    });
                }
            }

            const isAdmin = isOwner || (combinedBitmask & SENSITIVE_PERMISSIONS.Administrator) === SENSITIVE_PERMISSIONS.Administrator;
            const effectiveDangerousPerms: string[] = [];

            if (isAdmin) {
                effectiveDangerousPerms.push(...Object.keys(SENSITIVE_PERMISSIONS));
            } else {
                for (const [permName, permBit] of Object.entries(SENSITIVE_PERMISSIONS)) {
                    if ((combinedBitmask & permBit) === permBit) {
                        effectiveDangerousPerms.push(permName);
                    }
                }
            }

            let highestPerm = "None";
            if (isOwner) {
                highestPerm = "Owner";
            } else if (isAdmin) {
                highestPerm = "Administrator";
            } else if (effectiveDangerousPerms.length > 0) {
                highestPerm = effectiveDangerousPerms[0];
            }

            if (effectiveDangerousPerms.length > 0 || isOwner) {
                anyDangerous = true;
            }

            results.push({
                guildId,
                userId,
                status: isComplete ? "MEMBER_FOUND" : "PARTIAL",
                isOwner,
                isAdmin,
                highestPermission: highestPerm,
                dangerousRoles,
                effectiveDangerousPermissions: effectiveDangerousPerms,
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
            hasDangerousPermissions: anyDangerous,
            guilds: results
        };
    }
}

export const dangerRolesService = new DangerRolesService();
