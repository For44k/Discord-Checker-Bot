import { Message } from 'discord.js';
import { executeCheckerRemove } from './checker';

export default {
    name: 'checkerremove',
    description: 'Revoke bot command authorization from a role or user',
    aliases: ['crr', 'removechecker', 'checkerdelete', 'checkerrange', 'crrem'],

    async execute(message: Message, args: string[]) {
        return executeCheckerRemove(message, args);
    }
};
