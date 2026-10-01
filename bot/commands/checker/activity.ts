import { Message } from 'discord.js';
import checkdeviceCommand from './checkdevice';

export default {
    name: 'activity',
    description: 'Inspect active client devices and real-time presence/activity telemetry.',
    aliases: ['act', 'presence', 'game', 'richpresence'],
    usage: '+activity <@user/id>',

    async execute(message: Message, args: string[]) {
        return checkdeviceCommand.execute(message, args);
    }
};
