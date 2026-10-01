import {
    Events,
    GuildMember,
    PermissionsBitField
} from "discord.js";
import { dispatchDangerRoleAlert } from "../../services/alertDispatcher";

const DANGER_PERMISSIONS = [
    { flag: PermissionsBitField.Flags.Administrator, name: "Administrator", tag: "Admin" },
    { flag: PermissionsBitField.Flags.ManageGuild, name: "Manage Server", tag: "Staff" },
    { flag: PermissionsBitField.Flags.ManageRoles, name: "Manage Roles", tag: "Staff" },
    { flag: PermissionsBitField.Flags.ManageChannels, name: "Manage Channels", tag: "Staff" },
    { flag: PermissionsBitField.Flags.BanMembers, name: "Ban Members", tag: "Staff" },
    { flag: PermissionsBitField.Flags.KickMembers, name: "Kick Members", tag: "Staff" },
    { flag: PermissionsBitField.Flags.MentionEveryone, name: "Mention Everyone", tag: "Staff" },
    { flag: PermissionsBitField.Flags.ManageWebhooks, name: "Manage Webhooks", tag: "Staff" },
    { flag: PermissionsBitField.Flags.ManageMessages, name: "Manage Messages", tag: "Staff" },
    { flag: PermissionsBitField.Flags.ModerateMembers, name: "Moderate Members", tag: "Staff" },
];

function extractDangerPerms(role: any): { perms: string[]; isAdm: boolean } {
    const dangerPerms: string[] = [];
    let isAdm = false;
    for (const { flag, name, tag } of DANGER_PERMISSIONS) {
        if (role.permissions?.has(flag)) {
            dangerPerms.push(name);
            if (tag === "Admin") isAdm = true;
        }
    }
    return { perms: dangerPerms, isAdm };
}

export default {
    name: Events.GuildMemberUpdate,
    async execute(oldMember: GuildMember, newMember: GuildMember) {
        if (!newMember.guild) return;
        if (newMember.user?.bot) return;

        const oldRoles = oldMember.roles.cache;
        const newRoles = newMember.roles.cache;

        const addedRoles = newRoles.filter(r => !oldRoles.has(r.id));
        const removedRoles = oldRoles.filter(r => !newRoles.has(r.id));

        if (addedRoles.size === 0 && removedRoles.size === 0) return;

        const flaggedAdded: { role: any; perms: string[]; tag: string }[] = [];
        for (const [, role] of addedRoles) {
            const { perms, isAdm } = extractDangerPerms(role);
            if (perms.length > 0) {
                flaggedAdded.push({ role, perms, tag: isAdm ? "Admin" : "Staff" });
            }
        }

        const flaggedRemoved: { role: any; perms: string[]; tag: string }[] = [];
        for (const [, role] of removedRoles) {
            const { perms, isAdm } = extractDangerPerms(role);
            if (perms.length > 0) {
                flaggedRemoved.push({ role, perms, tag: isAdm ? "Admin" : "Staff" });
            }
        }

        if (flaggedAdded.length === 0 && flaggedRemoved.length === 0) return;

        const avatar = newMember.user.displayAvatarURL({ size: 512, extension: "png" });

        for (const item of flaggedAdded) {
            await dispatchDangerRoleAlert(newMember.client, {
                guildId: newMember.guild.id,
                guildName: newMember.guild.name,
                userId: newMember.id,
                userTag: newMember.user.tag,
                userAvatar: avatar,
                roleId: item.role.id,
                roleName: item.role.name,
                action: "added",
                permissions: item.perms,
                timestamp: Date.now()
            }).catch(() => {});
        }

        for (const item of flaggedRemoved) {
            await dispatchDangerRoleAlert(newMember.client, {
                guildId: newMember.guild.id,
                guildName: newMember.guild.name,
                userId: newMember.id,
                userTag: newMember.user.tag,
                userAvatar: avatar,
                roleId: item.role.id,
                roleName: item.role.name,
                action: "removed",
                permissions: item.perms,
                timestamp: Date.now()
            }).catch(() => {});
        }
    }
};
