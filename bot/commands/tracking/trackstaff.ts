import { Message } from "discord.js";
import { StaffService } from "../../database/services/staffStore";
import { apiGet } from "../../services/api/apiService";
import { buildTrackStaffNoRoles, buildTrackStaffNoStaffFound, buildTrackStaffPage } from "../../utils/ui/tracking/trackstaffUI";

export default {
    name: "trackstaff",
    description: "Track staff (by configured roles) across every server the user token is in.",
    aliases: ["ts", "staffvoice", "voicestaff"],

    async execute(message: Message, args: string[]) {
        const guild = message.guild;
        if (!guild) return message.reply("This command must be used in a server.");

        const staffRoleIds = StaffService.loadStaffRoles(guild.id);
        if (!staffRoleIds.length) {
            return message.reply(buildTrackStaffNoRoles());
        }

        const staffMembersMap = new Map<string, { member: any; matchedRoleIds: string[] }>();

        for (const roleId of staffRoleIds) {
            const role = guild.roles.cache.get(roleId);
            if (!role) continue;

            for (const member of role.members.values()) {
                if (!staffMembersMap.has(member.id)) {
                    staffMembersMap.set(member.id, {
                        member: {
                            id: member.id,
                            tag: member.user.tag,
                            username: member.user.username,
                            avatar: member.user.displayAvatarURL({ extension: "png", size: 128 }),
                        },
                        matchedRoleIds: [roleId]
                    });
                } else {
                    staffMembersMap.get(member.id)!.matchedRoleIds.push(roleId);
                }
            }
        }

        if (staffMembersMap.size === 0) {
            return message.reply(buildTrackStaffNoStaffFound(message));
        }

        const staffList = Array.from(staffMembersMap.entries());

        const voiceResults = await Promise.allSettled(
            staffList.map(([userId]) => apiGet(`/api/user-voice/${userId}`, 0, true))
        );

        const entries: any[] = [];
        let inVoiceCount = 0;
        let notInVoiceCount = 0;

        for (let i = 0; i < staffList.length; i++) {
            const [userId, staffInfo] = staffList[i];
            const res = voiceResults[i];
            const voiceData: any = res.status === "fulfilled" ? res.value : null;

            const inVoice = Boolean(voiceData?.inVoice && voiceData?.matches?.length > 0);
            if (inVoice) {
                inVoiceCount++;
                const match = voiceData.matches[0];
                entries.push({
                    kind: "voice",
                    payload: {
                        member: staffInfo.member,
                        matchedRoleIds: staffInfo.matchedRoleIds,
                        voiceGuild: {
                            id: match.guildId,
                            name: match.guildName,
                        },
                        channel: {
                            id: match.channelId,
                            name: match.channelName,
                        },
                        muted: match.selfMute,
                        deafened: match.selfDeaf,
                        streaming: match.streaming,
                        video: match.video,
                    }
                });
            } else {
                notInVoiceCount++;
                entries.push({
                    kind: "offline",
                    payload: {
                        member: staffInfo.member,
                        matchedRoleIds: staffInfo.matchedRoleIds,
                        matchedIn: [{ guildId: guild.id, guildName: guild.name }],
                    }
                });
            }
        }

        entries.sort((a, b) => {
            if (a.kind === "voice" && b.kind !== "voice") return -1;
            if (a.kind !== "voice" && b.kind === "voice") return 1;
            return 0;
        });

        const totalPages = Math.ceil(entries.length / 3) || 1;
        let currentPage = 0;

        const responseMsg = await message.reply(
            buildTrackStaffPage(entries, inVoiceCount, notInVoiceCount, currentPage, totalPages, message)
        );

        if (totalPages <= 1 || !responseMsg) return;

        const collector = responseMsg.createMessageComponentCollector({
            time: 180_000,
            filter: (i: any) => i.user.id === message.author.id
        });

        collector.on('collect', async (i: any) => {
            try { await i.deferUpdate(); } catch (_) { }

            if (i.customId === 'ts_prev') {
                currentPage = Math.max(0, currentPage - 1);
            } else if (i.customId === 'ts_next') {
                currentPage = Math.min(totalPages - 1, currentPage + 1);
            } else {
                return;
            }

            try {
                await responseMsg.edit(
                    buildTrackStaffPage(entries, inVoiceCount, notInVoiceCount, currentPage, totalPages, message)
                );
            } catch (_) { }
        });
    }
};
