import { VoiceCompanionModel, IVoiceCompanion } from '../models/VoiceCompanion.js';

export class VoiceCompanionRepository {
    async incrementSharedDuration(userId: string, companionId: string, guildId: string, durationSeconds: number): Promise<void> {
        if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return;

        await VoiceCompanionModel.updateOne(
            { userId, companionId, guildId },
            {
                $inc: { sharedDurationSeconds: Math.floor(durationSeconds) },
                $set: { lastSeen: new Date() },
                $setOnInsert: { userId, companionId, guildId },
            },
            { upsert: true }
        );
    }

    async getPairSharedDuration(userId: string, companionId: string): Promise<number> {
        const [result] = await VoiceCompanionModel.aggregate([
            { $match: { userId, companionId } },
            { $group: { _id: null, total: { $sum: '$sharedDurationSeconds' } } },
        ]);
        return result?.total ?? 0;
    }

    async getTopCompanions(userId: string, limit: number = 3): Promise<{ companionId: string; sharedDurationSeconds: number }[]> {
        return VoiceCompanionModel.aggregate([
            { $match: { userId } },
            { $group: { _id: '$companionId', sharedDurationSeconds: { $sum: '$sharedDurationSeconds' } } },
            { $sort: { sharedDurationSeconds: -1 } },
            { $limit: limit },
            { $project: { _id: 0, companionId: '$_id', sharedDurationSeconds: 1 } },
        ]);
    }

    async getTopCompanionsForGuild(userId: string, guildId: string, limit: number = 3): Promise<IVoiceCompanion[]> {
        return VoiceCompanionModel.find({ userId, guildId })
            .sort({ sharedDurationSeconds: -1 })
            .limit(limit);
    }
}

export const voiceCompanionRepository = new VoiceCompanionRepository();
