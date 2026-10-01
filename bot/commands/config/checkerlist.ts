import { Message } from 'discord.js';
import { executeCheckerList } from './checker';

export default {
    name: 'checkerlist',
    description: 'List all authorized checker roles and users in this server',
    aliases: ['crl', 'listchecker', 'checkerslist', 'checkerls'],

    async execute(message: Message, _args: string[]) {
        return executeCheckerList(message);
    }
};
