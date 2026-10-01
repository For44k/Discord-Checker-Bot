import { VoiceSessionModel, IVoiceSession } from '../models/VoiceSession.js';

export type VoiceSessionInput = {
  userId: string;
  guildId: string;
  channelId: string;
  startedAt?: Date;
  lastUpdated: Date;
};

export class VoiceSessionRepository {
  async bulkUpsert(sessions: VoiceSessionInput[]): Promise<void> {
    if (sessions.length === 0) {
      return;
    }

    const bulkOps = sessions.map((session) => ({
      updateOne: {
        filter: { userId: session.userId, guildId: session.guildId },
        update: {
          $set: {
            channelId: session.channelId,
            lastUpdated: session.lastUpdated,
          },
          $setOnInsert: {
            startedAt: session.startedAt || session.lastUpdated,
          },
        },
        upsert: true,
      },
    }));

    await VoiceSessionModel.bulkWrite(bulkOps);
  }

  async bulkDelete(sessions: { userId: string; guildId: string }[]): Promise<void> {
    if (sessions.length === 0) {
      return;
    }

    const bulkOps = sessions.map((session) => ({
      deleteOne: {
        filter: { userId: session.userId, guildId: session.guildId },
      },
    }));

    await VoiceSessionModel.bulkWrite(bulkOps);
  }

  async deleteSession(userId: string, guildId: string): Promise<boolean> {
    const result = await VoiceSessionModel.deleteOne({
      userId,
      guildId,
    });
    return result.deletedCount > 0;
  }

  async getActiveSession(userId: string, guildId: string): Promise<IVoiceSession | null> {
    return VoiceSessionModel.findOne({ userId, guildId }).exec();
  }

  async getGuildActiveSessions(guildId: string): Promise<IVoiceSession[]> {
    return VoiceSessionModel.find({ guildId }).exec();
  }

  async getUserSessions(userId: string): Promise<IVoiceSession[]> {
    return VoiceSessionModel.find({ userId }).exec();
  }

  async getActiveSessionsForUser(userId: string): Promise<IVoiceSession[]> {
    return this.getUserSessions(userId);
  }
}

export const voiceSessionRepository = new VoiceSessionRepository();
