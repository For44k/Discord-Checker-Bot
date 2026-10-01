import { Message } from 'discord.js';
import { executeCheckerAdd } from './checker';

export default {
    name: 'checkeradd',
    description: 'Grant a role or user permission to use bot commands',
    aliases: ['cadd', 'addchecker', 'ca'],

    async execute(message: Message, args: string[]) {
        return executeCheckerAdd(message, args);
    }
};
