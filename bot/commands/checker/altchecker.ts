import { Message, UserFlagsBitField } from 'discord.js';
import { resolveUser } from '../../services/userResolver';
import { userNotFoundReply } from '../../utils/ui/usages';
import { buildAltCheckerPayload, AltAnalysis } from '../../utils/ui/checker/altcheckerUI';

export default {
    name: 'altchecker',
    description: 'Inspect account creation, join velocity, avatar forensic, and alt risk score',
    aliases: ['altcheck', 'checkalt', 'alt', 'ac', 'isalt'],

    async execute(message: Message, args: string[]) {
        const user = await resolveUser(message, args);
        if (!user) {
            return message.reply(userNotFoundReply());
        }

        const member = message.guild?.members.cache.get(user.id) || (await message.guild?.members.fetch(user.id).catch(() => null)) || null;

        const now = Date.now();
        const createdTimestamp = user.createdTimestamp;
        const accountAgeDays = Math.max(0, Math.floor((now - createdTimestamp) / (1000 * 60 * 60 * 24)));

        const joinedTimestamp = member?.joinedTimestamp || null;
        const serverJoinAgeDays = joinedTimestamp !== null ? Math.max(0, Math.floor((now - joinedTimestamp) / (1000 * 60 * 60 * 24))) : null;

        const isDefaultAvatar = user.avatar === null;
        const avatarUrl = user.displayAvatarURL({ size: 512, extension: 'png' });

        let mutualGuildsCount = 0;
        if (message.client.guilds?.cache) {
            mutualGuildsCount = message.client.guilds.cache.filter(g => g.members.cache.has(user.id)).size;
        }

        const flags: string[] = [];
        const userFlags = user.flags || (await user.fetchFlags().catch(() => null));
        if (userFlags) {
            if (userFlags.has(UserFlagsBitField.Flags.HypeSquadOnlineHouse1)) flags.push('Bravery');
            if (userFlags.has(UserFlagsBitField.Flags.HypeSquadOnlineHouse2)) flags.push('Brilliance');
            if (userFlags.has(UserFlagsBitField.Flags.HypeSquadOnlineHouse3)) flags.push('Balance');
            if (userFlags.has(UserFlagsBitField.Flags.ActiveDeveloper)) flags.push('Active Developer');
            if (userFlags.has(UserFlagsBitField.Flags.PremiumEarlySupporter)) flags.push('Early Supporter');
            if (userFlags.has(UserFlagsBitField.Flags.VerifiedDeveloper)) flags.push('Verified Dev');
            if (userFlags.has(UserFlagsBitField.Flags.Staff)) flags.push('Discord Staff');
            if (userFlags.has(UserFlagsBitField.Flags.CertifiedModerator)) flags.push('Certified Mod');
            if (userFlags.has(UserFlagsBitField.Flags.BugHunterLevel1) || userFlags.has(UserFlagsBitField.Flags.BugHunterLevel2)) flags.push('Bug Hunter');
        }
        if (user.bot) flags.push('Automated Bot');

        let riskScore = 20;
        const riskFactors: string[] = [];
        const safeFactors: string[] = [];


        if (accountAgeDays < 3) {
            riskScore += 65;
            riskFactors.push(`Fresh account created less than 3 days ago (${accountAgeDays}d)`);
        } else if (accountAgeDays < 7) {
            riskScore += 50;
            riskFactors.push(`Account created within the last week (${accountAgeDays}d)`);
        } else if (accountAgeDays < 14) {
            riskScore += 35;
            riskFactors.push(`Account created within the last 2 weeks (${accountAgeDays}d)`);
        } else if (accountAgeDays < 30) {
            riskScore += 20;
            riskFactors.push(`Account created within the last 30 days (${accountAgeDays}d)`);
        } else if (accountAgeDays < 90) {
            riskScore += 10;
            riskFactors.push(`Account is under 3 months old (${accountAgeDays}d)`);
        } else if (accountAgeDays > 730) {
            riskScore -= 25;
            safeFactors.push(`Well established account (over ${Math.floor(accountAgeDays / 365)} years old)`);
        } else if (accountAgeDays > 365) {
            riskScore -= 15;
            safeFactors.push(`Established account (over 1 year old)`);
        } else {
            safeFactors.push(`Normal account age (${accountAgeDays} days)`);
        }


        if (isDefaultAvatar) {
            if (accountAgeDays < 60) {
                riskScore += 20;
                riskFactors.push('Uses default generic Discord avatar with recent creation date');
            } else {
                riskScore += 10;
                riskFactors.push('Default Discord avatar');
            }
        } else {
            riskScore -= 10;
            safeFactors.push('Configured custom avatar profile picture');
        }


        if (joinedTimestamp !== null) {
            const joinDiffMinutes = Math.floor((now - joinedTimestamp) / (1000 * 60));
            if (joinDiffMinutes < 60) {
                riskScore += 15;
                riskFactors.push(`Just joined server within the last hour (${joinDiffMinutes}m ago)`);
            } else if (joinDiffMinutes < 1440) {
                riskScore += 8;
                riskFactors.push(`Joined server today <24 hours ago`);
            } else if (serverJoinAgeDays !== null && serverJoinAgeDays > 60) {
                riskScore -= 10;
                safeFactors.push(`Long-term server member (${serverJoinAgeDays} days in server)`);
            }
        }


        if (flags.length > 0) {
            riskScore -= flags.length * 8;
            safeFactors.push(`Possesses official badges (${flags.join(', ')})`);
        } else if (accountAgeDays > 90) {
            riskFactors.push('No profile badges detected');
        }


        if (mutualGuildsCount >= 10) {
            riskScore -= 20;
            safeFactors.push(`High mutual footprint: present in ${mutualGuildsCount} monitored servers`);
        } else if (mutualGuildsCount >= 3) {
            riskScore -= 10;
            safeFactors.push(`Present in ${mutualGuildsCount} mutual servers`);
        } else if (mutualGuildsCount <= 1) {
            riskScore += 5;
            riskFactors.push(`Low mutual server visibility (${mutualGuildsCount} server)`);
        }


        riskScore = Math.max(0, Math.min(100, riskScore));

        let riskLevel: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' | 'ESTABLISHED' = 'ESTABLISHED';
        if (riskScore >= 80) {
            riskLevel = 'CRITICAL';
        } else if (riskScore >= 60) {
            riskLevel = 'HIGH';
        } else if (riskScore >= 35) {
            riskLevel = 'MODERATE';
        } else if (riskScore >= 15) {
            riskLevel = 'LOW';
        } else {
            riskLevel = 'ESTABLISHED';
        }

        const analysis: AltAnalysis = {
            accountAgeDays,
            accountCreatedAt: new Date(createdTimestamp),
            serverJoinAgeDays,
            serverJoinedAt: joinedTimestamp ? new Date(joinedTimestamp) : null,
            isDefaultAvatar,
            avatarUrl,
            riskScore,
            riskLevel,
            flags,
            riskFactors,
            safeFactors
        };

        const payload = buildAltCheckerPayload(user, member, mutualGuildsCount, analysis);
        return message.reply(payload);
    }
};
