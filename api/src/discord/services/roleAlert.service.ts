import { GuildMember, Role } from "discord.js-selfbot-v13";
import { AlertConfigModel, IAlertConfigDoc } from "../../database/models/AlertConfig.model.js";
import { eventBroadcaster } from "../../websocket/eventBroadcaster.js";
import { WsRoleAlertPayload } from "../../types/apiContracts.js";
import { discordClientManager } from "../client/clientManager.js";

const HIGH_PERMISSIONS = [
    { flag: 8n, name: "Administrator", tag: "Admin" },
    { flag: 32n, name: "Manage Server", tag: "Staff" },
    { flag: 268435456n, name: "Manage Roles", tag: "Staff" },
    { flag: 16n, name: "Manage Channels", tag: "Staff" },
    { flag: 4n, name: "Ban Members", tag: "Staff" },
    { flag: 2n, name: "Kick Members", tag: "Staff" },
    { flag: 131072n, name: "Mention Everyone", tag: "Staff" },
    { flag: 536870912n, name: "Manage Webhooks", tag: "Staff" }
];

export interface RoleAlertEvent {
    guildId: string;
    guildName: string;
    userId: string;
    userTag: string;
    rolesAdded: { id: string; name: string; tag: string; permissions: string[] }[];
    timestamp: number;
}

export class RoleAlertService {
    private alertConfigCache: Map<string, string> = new Map();
    private recentAlerts: RoleAlertEvent[] = [];
    private initialized = false;
    private botToken: string = process.env.BOT_TOKEN || process.env.DISCORD_BOT_TOKEN || "";

    public async init(): Promise<void> {
        if (this.initialized) return;
        try {
            const configs = await AlertConfigModel.find({}).lean();
            for (const cfg of configs) {
                const configDoc = cfg as unknown as IAlertConfigDoc;
                if (configDoc.guildId && configDoc.channelId) {
                    this.alertConfigCache.set(configDoc.guildId, configDoc.channelId);
                }
            }
            this.initialized = true;
        } catch (e) {
            console.warn("[RoleAlertService] Failed to load alert configs:", e);
        }
    }

    public getConfig(guildId: string): string | null {
        if (!this.initialized) {
            void this.init().catch(() => {});
        }
        return this.alertConfigCache.get(guildId) || null;
    }

    public async setConfig(guildId: string, channelId: string): Promise<void> {
        this.alertConfigCache.set(guildId, channelId);
        await AlertConfigModel.updateOne(
            { guildId },
            { guildId, channelId },
            { upsert: true }
        ).catch(() => {});
    }

    public async removeConfig(guildId: string): Promise<void> {
        this.alertConfigCache.delete(guildId);
        await AlertConfigModel.deleteOne({ guildId }).catch(() => {});
    }

    public getRecentAlerts(limit: number = 20): RoleAlertEvent[] {
        return this.recentAlerts.slice(0, limit);
    }

    public async handleMemberUpdate(newMember: GuildMember, previousRoleIds: string[]): Promise<void> {
        if (!newMember.guild) return;
        if (newMember.user?.bot) return;

        const currentRoles = Array.from(newMember.roles.cache.values()).filter((r: Role) => r.id !== newMember.guild.id);
        const currentRoleIds = currentRoles.map((r: Role) => r.id);

        const addedRoles = currentRoles.filter((r: Role) => !previousRoleIds.includes(r.id));
        const removedRoleObjects = (newMember.guild.roles.cache ? Array.from(newMember.guild.roles.cache.values()) : [])
            .filter((r: Role) => previousRoleIds.includes(r.id) && !currentRoleIds.includes(r.id));

        if (addedRoles.length === 0 && removedRoleObjects.length === 0) return;

        const flaggedAdded: { id: string; name: string; tag: string; permissions: string[] }[] = [];
        for (const role of addedRoles) {
            let rawBitfield = 0n;
            try {
                const bit = role.permissions?.bitfield;
                rawBitfield = BigInt(bit !== undefined && bit !== null ? bit.toString() : "0");
            } catch {
                rawBitfield = 0n;
            }

            const dangerPerms: string[] = [];
            let isAdm = false;

            for (const { flag, name, tag } of HIGH_PERMISSIONS) {
                if ((rawBitfield & flag) === flag) {
                    dangerPerms.push(name);
                    if (tag === "Admin") isAdm = true;
                }
            }

            if (dangerPerms.length > 0) {
                flaggedAdded.push({
                    id: role.id,
                    name: role.name || "Unknown Role",
                    tag: isAdm ? "Admin" : "Staff",
                    permissions: dangerPerms
                });
            }
        }

        const flaggedRemoved: { id: string; name: string; tag: string; permissions: string[] }[] = [];
        for (const role of removedRoleObjects) {
            let rawBitfield = 0n;
            try {
                const bit = role.permissions?.bitfield;
                rawBitfield = BigInt(bit !== undefined && bit !== null ? bit.toString() : "0");
            } catch {
                rawBitfield = 0n;
            }

            const dangerPerms: string[] = [];
            let isAdm = false;

            for (const { flag, name, tag } of HIGH_PERMISSIONS) {
                if ((rawBitfield & flag) === flag) {
                    dangerPerms.push(name);
                    if (tag === "Admin") isAdm = true;
                }
            }

            if (dangerPerms.length > 0) {
                flaggedRemoved.push({
                    id: role.id,
                    name: role.name || "Unknown Role",
                    tag: isAdm ? "Admin" : "Staff",
                    permissions: dangerPerms
                });
            }
        }

        if (flaggedAdded.length === 0 && flaggedRemoved.length === 0) return;

        const now = Date.now();
        const userTag = newMember.user?.tag || newMember.user?.username || newMember.id;
        const userAvatar = newMember.user?.displayAvatarURL({ format: "png", dynamic: true, size: 512 })
            || newMember.user?.avatarURL({ format: "png", dynamic: true, size: 512 })
            || `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(newMember.id) % 5n)}.png`;

        for (const flagged of flaggedAdded) {
            eventBroadcaster.broadcast<WsRoleAlertPayload>("ROLE_ALERT", {
                guildId: newMember.guild.id,
                guildName: newMember.guild.name,
                userId: newMember.id,
                userTag,
                userAvatar,
                isBot: false,
                roleId: flagged.id,
                roleName: flagged.name,
                action: "added",
                isDangerous: true,
                permissions: flagged.permissions,
                timestamp: now
            });
        }

        for (const flagged of flaggedRemoved) {
            eventBroadcaster.broadcast<WsRoleAlertPayload>("ROLE_ALERT", {
                guildId: newMember.guild.id,
                guildName: newMember.guild.name,
                userId: newMember.id,
                userTag,
                userAvatar,
                isBot: false,
                roleId: flagged.id,
                roleName: flagged.name,
                action: "removed",
                isDangerous: true,
                permissions: flagged.permissions,
                timestamp: now
            });
        }

        const channelId = this.getConfig(newMember.guild.id);
        if (!channelId) return;

        if (flaggedAdded.length > 0) {
            await this.dispatchDiscordAlert(newMember, channelId, flaggedAdded, "added", userAvatar);
        }
        if (flaggedRemoved.length > 0) {
            await this.dispatchDiscordAlert(newMember, channelId, flaggedRemoved, "removed", userAvatar);
        }
    }

    private async dispatchDiscordAlert(
        member: GuildMember,
        channelId: string,
        flaggedRoles: { id: string; name: string; tag: string; permissions: string[] }[],
        action: "added" | "removed" = "added",
        userAvatar?: string
    ): Promise<void> {
        try {
            const EMOJI_ALERT = action === "added" ? "<a:cutekuromis:1550907953027227738>" : "<a:kawaiiangrykuromi:1535618976091086888>";
            const EMOJI_SHIELD = "<a:laughingbear:1551020464476913774>";
            const title = action === "added" ? "Dangerous Role Granted Alert" : "Dangerous Role Revoked Alert";
            const sectionTitle = action === "added" ? `Granted Roles (${flaggedRoles.length})` : `Revoked Roles (${flaggedRoles.length})`;

            const avatar = userAvatar || member.user?.displayAvatarURL({ format: "png", dynamic: true, size: 512 }) || "https://cdn.discordapp.com/embed/avatars/0.png";
            const unixTime = Math.floor(Date.now() / 1000);

            const roleLines = flaggedRoles.map((f) => {
                const permsDisplay = f.permissions.map((p) => `\`${p}\``).join(", ");
                return `> - __\`${f.name}\`__ | \`${f.id}\` \`[${f.tag}]\`\n- __Permission:__ ${permsDisplay}`;
            });

            const payload = {
                flags: 32768,
                components: [
                    {
                        type: 17,
                        accent_color: 0xbbedff,
                        components: [
                            {
                                type: 10,
                                content: `# ${EMOJI_ALERT} __${title}__\n-# - __Across High Fidelity Servers..!!__`
                            },
                            { type: 14, spacing: 1, divider: true },
                            {
                                type: 9,
                                components: [
                                    {
                                        type: 10,
                                        content: `- __Target User:__ <@${member.id}> (\`${member.id}\`)\n` +
                                            `- __Server:__ \`${member.guild.name}\` | \`${member.guild.id}\`\n` +
                                            `- __Timestamp:__ <t:${unixTime}:R>`
                                    }
                                ],
                                accessory: {
                                    type: 11,
                                    media: { url: avatar }
                                }
                            },
                            { type: 14, spacing: 1, divider: true },
                            {
                                type: 10,
                                content: `## ${EMOJI_SHIELD} __${sectionTitle}__\n` +
                                    roleLines.join("\n\n")
                            },
                            { type: 14, spacing: 1, divider: true }
                        ]
                    }
                ]
            };

            const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
                method: "POST",
                headers: {
                    Authorization: `Bot ${this.botToken}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const fallbackEmbed = {
                    embeds: [
                        {
                            color: 0xbbedff,
                            title: title,
                            thumbnail: { url: userAvatar },
                            description: `**Target:** <@${member.id}> (\`${member.user?.tag}\`)\n**User ID:** \`${member.id}\`\n**Server:** \`${member.guild.name}\`\n**Time:** <t:${unixTime}:R>\n\n**Roles:**\n` +
                                flaggedRoles.map((r) => `• **${r.name}** (\`${r.id}\`) - \`${r.permissions.join(", ")}\``).join("\n")
                        }
                    ]
                };
                await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
                    method: "POST",
                    headers: {
                        Authorization: `Bot ${this.botToken}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(fallbackEmbed)
                }).catch(() => {});
            }
        } catch (err) {
            console.error("[RoleAlertService] Error sending alert to Discord:", err);
        }
    }
}

export const roleAlertService = new RoleAlertService();
