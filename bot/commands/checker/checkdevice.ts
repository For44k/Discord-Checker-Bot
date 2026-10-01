import {
    ContainerBuilder,
    SectionBuilder,
    TextDisplayBuilder,
    ThumbnailBuilder,
    Message,
    User,
    Activity,
    ActivityType
} from 'discord.js';
import { sep, text, v2, safeSection } from '../../utils/ui/components';
import { usageExampleReply, errorReply, userNotFoundReply } from '../../utils/ui/usages';
import { resolveUser } from '../../services/userResolver';
import { fetchUserPresence, fetchUserDevice } from '../../services/api/apiService';

const EMBEDV2_COLOR = 0xBBEDFF;
const EMOJI_HEADER = '<a:cutekuromis:1550907953027227738>';
const EMOJI_DEVICES = '<:custom_emoji:1550907736999460885>';
const EMOJI_ACTIVITY = '<a:05_penguin_football:1550911039657214002>';

interface DeviceStatusPayload {
    desktop?: string;
    mobile?: string;
    web?: string;
}

interface ActivityPayload {
    type: number;
    name: string;
    state?: string;
    details?: string;
}

export default {
    name: 'checkdevice',
    description: 'Inspect active client devices (Desktop, Mobile, Web) and presence telemetry for a target user.',
    aliases: ['cd', 'device', 'devices', 'checkclient', 'activity', 'act'],
    usage: '+checkdevice <@user/id>',

    async execute(message: Message, args: string[]) {
        let targetUser: User | null = null;

        if (!args || args.length === 0 || !args[0]) {
            targetUser = message.author;
        } else {
            targetUser = await resolveUser(message, args);
        }

        if (!targetUser) {
            return message.reply(userNotFoundReply());
        }

        let member = message.guild?.members.cache.get(targetUser.id);
        if (!member && message.guild) {
            member = await message.guild.members.fetch({ user: targetUser.id, withPresences: true }).catch(() => undefined);
        }

        let presence = member?.presence;
        if (!presence || presence.status === 'offline') {
            for (const g of message.client.guilds.cache.values()) {
                const gm = g.members.cache.get(targetUser.id);
                if (gm?.presence && gm.presence.status !== 'offline') {
                    presence = gm.presence;
                    member = gm;
                    break;
                }
            }
        }

        const avatar = targetUser.displayAvatarURL({ size: 512, extension: 'png' });

        let apiPresence: { status?: string; clientStatus?: DeviceStatusPayload; activities?: ActivityPayload[] } | null = null;
        let apiDevice: { platforms?: DeviceStatusPayload; status?: string } | null = null;

        const [presenceRes, deviceRes] = await Promise.all([
            fetchUserPresence(targetUser.id, false).catch(() => null),
            fetchUserDevice(targetUser.id, false).catch(() => null),
        ]);

        if (presenceRes && typeof presenceRes === 'object') {
            apiPresence = presenceRes as { status?: string; clientStatus?: DeviceStatusPayload; activities?: ActivityPayload[] };
        }
        if (deviceRes && typeof deviceRes === 'object') {
            const dData = (deviceRes as Record<string, unknown>).data || deviceRes;
            apiDevice = dData as { platforms?: DeviceStatusPayload; status?: string };
        }

        const statusMap: Record<string, string> = {
            online: 'Online',
            idle: 'Idle / Away',
            dnd: 'Do Not Disturb',
            offline: 'Offline / Invisible'
        };

        const overallStatusRaw = presence?.status || apiPresence?.status || (apiDevice?.status !== 'UNAVAILABLE' ? apiDevice?.status : 'offline') || 'offline';
        const overallStatus = statusMap[overallStatusRaw] || overallStatusRaw;

        const clientStatus = (presence?.clientStatus || apiPresence?.clientStatus || apiDevice?.platforms) as DeviceStatusPayload | undefined;

        const formatDeviceStatus = (devStatus?: string) => {
            if (!devStatus || devStatus === 'offline' || devStatus === 'unknown') return '`Offline`';
            return `\`Active (${devStatus.toUpperCase()})\``;
        };

        const desktopStatus = formatDeviceStatus(clientStatus?.desktop);
        const mobileStatus = formatDeviceStatus(clientStatus?.mobile);
        const webStatus = formatDeviceStatus(clientStatus?.web);

        const activities: Array<Activity | ActivityPayload> = (presence?.activities && presence.activities.length > 0)
            ? presence.activities
            : (apiPresence?.activities || []);

        let activityLines = '> - `None / Idle`';
        if (activities.length > 0) {
            activityLines = activities.map((a) => {
                const actType = typeof a.type === 'number' ? a.type : 0;
                const actName = a.name || 'Activity';
                const actState = (a as { state?: string }).state || '';
                const actDetails = a.details ? ` | \`${a.details}\`` : '';

                if (actType === ActivityType.Custom || actName === 'Custom Status') {
                    const statusText = actState || actName;
                    return `> - __Custom Status:__ \`${statusText}\``;
                }
                if (actType === ActivityType.Listening || actName === 'Spotify') {
                    const track = a.details || actName;
                    const artist = actState ? ` by \`${actState}\`` : '';
                    return `> - __Listening to:__ \`${track}\`${artist}`;
                }
                if (actType === ActivityType.Streaming) {
                    return `> - __Streaming:__ \`${actName}\`${actDetails}`;
                }
                if (actType === ActivityType.Watching) {
                    return `> - __Watching:__ \`${actName}\`${actDetails}`;
                }
                if (actType === ActivityType.Competing) {
                    return `> - __Competing in:__ \`${actName}\`${actDetails}`;
                }
                return `> - __Playing:__ \`${actName}\`${actDetails}${actState ? ` (\`${actState}\`)` : ''}`;
            }).join('\n');
        }

        const deviceContainer = new ContainerBuilder()
            .setAccentColor(EMBEDV2_COLOR)
            .addTextDisplayComponents(
                text(
                    `# ${EMOJI_HEADER} __User Device & Presence Inspection__\n` +
                    `> - **__Real-Time Session Telemetry__**`
                )
            )
            .addSeparatorComponents(sep())
            .addSectionComponents(
                safeSection(
                    `## Target Information\n` +
                    `- __Target User:__ <@${targetUser.id}>\n` +
                    `- __User ID:__ \`${targetUser.id}\`\n` +
                    `- __Overall Status:__ \`${overallStatus}\``,
                    avatar
                )
            )
            .addSeparatorComponents(sep())
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `## ${EMOJI_DEVICES} __Active Client Devices__\n` +
                    `- __Desktop (PC / App):__ ${desktopStatus}\n` +
                    `- __Mobile (iOS / Android):__ ${mobileStatus}\n` +
                    `- __Web Browser (Discord Web):__ ${webStatus}`
                )
            )
            .addSeparatorComponents(sep())
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `## ${EMOJI_ACTIVITY} __Current Activity & Presence__\n${activityLines}`
                )
            )
            .addSeparatorComponents(sep());

        return message.reply(v2([deviceContainer]));
    }
};
