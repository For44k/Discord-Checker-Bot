import { Message, PermissionsBitField } from 'discord.js';
import { PrefixService } from '../../database/services/prefixStore';
import { PermissionService } from '../../database/services/permissionStore';
import {
    buildCheckerSystemPayload,
    buildCheckerAddSuccessPayload,
    buildCheckerRemoveSuccessPayload,
    buildCheckerListPayload
} from '../../utils/ui/config/checkerUI';
import { usageExampleReply, errorReply } from '../../utils/ui/usages';

export async function executeCheckerAdd(message: Message, args: string[]) {
    if (!message.guild) return message.reply('This command must be used in a server.');
    if (!message.member?.permissions?.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply(errorReply({
            title: 'Permission Denied',
            errors: ['Only server administrators can configure checker permissions.'],
            user: message.author
        }));
    }

    const raw = args[0] ? args[0].trim() : '';
    const cleanId = raw.replace(/[<@!&#>]/g, '');

    let targetRole = message.mentions.roles.first();
    let targetUser = message.mentions.users.filter(u => u.id !== message.client.user?.id).first();

    if (!targetRole && !targetUser && cleanId) {
        targetRole = message.guild.roles.cache.get(cleanId) || (await message.guild.roles.fetch(cleanId).catch(() => null)) || undefined;
        if (!targetRole) {
            targetUser = message.guild.members.cache.get(cleanId)?.user || (await message.client.users.fetch(cleanId).catch(() => null)) || undefined;
        }
    }

    if (!targetRole && !targetUser) {
        return message.reply(usageExampleReply({
            commandName: 'checker add',
            description: 'Grant bot command authorization to a role or specific user',
            usage: '+checker add <@role/@user/id>',
            example: '+checker add @Staff or +checker add @Member'
        }));
    }

    if (targetRole) {
        await PermissionService.setRole(message.guild.id, targetRole.id);
        const roles = PermissionService.getRoles(message.guild.id);
        const users = PermissionService.getUsers(message.guild.id);
        const payload = buildCheckerAddSuccessPayload(
            'role',
            { id: targetRole.id, name: targetRole.name },
            roles.length,
            users.length
        );
        return message.reply(payload);
    } else if (targetUser) {
        await PermissionService.setUser(message.guild.id, targetUser.id);
        const roles = PermissionService.getRoles(message.guild.id);
        const users = PermissionService.getUsers(message.guild.id);
        const payload = buildCheckerAddSuccessPayload(
            'user',
            { id: targetUser.id, name: targetUser.username, tag: targetUser.tag },
            roles.length,
            users.length
        );
        return message.reply(payload);
    }
}

export async function executeCheckerRemove(message: Message, args: string[]) {
    if (!message.guild) return message.reply('This command must be used in a server.');
    if (!message.member?.permissions?.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply(errorReply({
            title: 'Permission Denied',
            errors: ['Only server administrators can manage checker permissions.'],
            user: message.author
        }));
    }

    const raw = args[0] ? args[0].trim() : '';
    const cleanId = raw.replace(/[<@!&#>]/g, '');

    let targetRole = message.mentions.roles.first();
    let targetUser = message.mentions.users.filter(u => u.id !== message.client.user?.id).first();

    const currentRoles = PermissionService.getRoles(message.guild.id);
    const currentUsers = PermissionService.getUsers(message.guild.id);

    let resolvedType: 'role' | 'user' | null = null;
    let resolvedId: string | null = null;

    if (targetRole) {
        resolvedType = 'role';
        resolvedId = targetRole.id;
    } else if (targetUser) {
        resolvedType = 'user';
        resolvedId = targetUser.id;
    } else if (cleanId) {
        if (currentRoles.includes(cleanId)) {
            resolvedType = 'role';
            resolvedId = cleanId;
        } else if (currentUsers.includes(cleanId)) {
            resolvedType = 'user';
            resolvedId = cleanId;
        } else {
            const role = message.guild.roles.cache.get(cleanId) || (await message.guild.roles.fetch(cleanId).catch(() => null));
            if (role) {
                resolvedType = 'role';
                resolvedId = role.id;
            } else {
                resolvedType = 'user';
                resolvedId = cleanId;
            }
        }
    }

    if (!resolvedType || !resolvedId) {
        return message.reply(usageExampleReply({
            commandName: 'checker remove',
            description: 'Revoke bot command authorization from a role or specific user',
            usage: '+checker remove <@role/@user/id>',
            example: '+checker remove @Staff or +checker remove @Member'
        }));
    }

    if (resolvedType === 'role') {
        await PermissionService.removeRole(message.guild.id, resolvedId);
    } else {
        await PermissionService.removeUser(message.guild.id, resolvedId);
    }

    const roles = PermissionService.getRoles(message.guild.id);
    const users = PermissionService.getUsers(message.guild.id);

    const payload = buildCheckerRemoveSuccessPayload(
        resolvedType,
        resolvedId,
        roles.length,
        users.length
    );
    return message.reply(payload);
}

export async function executeCheckerList(message: Message) {
    if (!message.guild) return message.reply('This command must be used in a server.');
    const roles = PermissionService.getRoles(message.guild.id);
    const users = PermissionService.getUsers(message.guild.id);
    const payload = buildCheckerListPayload(message.guild, roles, users);
    return message.reply(payload);
}

export default {
    name: 'checker',
    description: 'Checker command access management system (add, remove, list, help)',
    aliases: ['checkers', 'checkerhelp', 'staffsystem', 'botaccess', 'access'],

    async execute(message: Message, args: string[]) {
        const subCommand = (args[0] || '').toLowerCase();

        if (subCommand === 'add' || subCommand === 'grant' || subCommand === 'set' || subCommand === '+') {
            return executeCheckerAdd(message, args.slice(1));
        }

        if (subCommand === 'remove' || subCommand === 'delete' || subCommand === 'rem' || subCommand === 'rm' || subCommand === 'del' || subCommand === '-') {
            return executeCheckerRemove(message, args.slice(1));
        }

        if (subCommand === 'list' || subCommand === 'ls' || subCommand === 'show' || subCommand === 'view' || subCommand === 'all') {
            return executeCheckerList(message);
        }


        if (message.mentions.roles.size > 0 || message.mentions.users.filter(u => u.id !== message.client.user?.id).size > 0) {
            return executeCheckerAdd(message, args);
        }

        const guildId = message.guild?.id || 'default';
        const prefix = await PrefixService.get(guildId);
        const payload = buildCheckerSystemPayload(prefix, message);
        return message.reply(payload);
    }
};
