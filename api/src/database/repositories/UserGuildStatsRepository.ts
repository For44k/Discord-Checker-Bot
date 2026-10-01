import { UserGuildStatsModel, IUserGuildStats } from '../models/UserGuildStats.js';

export type UserGuildStatsInput = {
  userId: string;
  guildId: string;
  guildName?: string;
  durationSeconds: number;
  messageCount: number;
  sessionCount?: number;
  lastSeen: Date;
};

export class UserGuildStatsRepository {
  async bulkUpsert(stats: UserGuildStatsInput[]): Promise<void> {
    if (stats.length === 0) return;

    const bulkOps = stats.map((stat) => ({
      updateOne: {
        filter: { userId: stat.userId, guildId: stat.guildId },
        update: {
          $inc: {
            durationSeconds: stat.durationSeconds,
            messageCount: stat.messageCount || 0,
            sessionCount: stat.sessionCount || 0,
          },
          $set: {
            guildName: stat.guildName,
            lastSeen: stat.lastSeen,
          },
        },
        upsert: true,
      },
    }));

    await UserGuildStatsModel.bulkWrite(bulkOps);
  }

  async getAllStatsForUser(userId: string): Promise<IUserGuildStats[]> {
    return this.getUserAllGuilds(userId);
  }

  async getUserStats(userId: string, guildId: string): Promise<IUserGuildStats | null> {
    return UserGuildStatsModel.findOne({ userId, guildId }).exec();
  }

  async getGuildTopUsers(guildId: string, limit: number = 10): Promise<IUserGuildStats[]> {
    return UserGuildStatsModel.find({ guildId }).sort({ durationSeconds: -1 }).limit(limit).exec();
  }

  async getUserAllGuilds(userId: string): Promise<IUserGuildStats[]> {
    return UserGuildStatsModel.find({ userId }).exec();
  }

  async incrementMessageCount(userId: string, guildId: string): Promise<void> {
    await UserGuildStatsModel.updateOne(
      { userId, guildId },
      { $inc: { messageCount: 1 }, $set: { lastSeen: new Date() } },
      { upsert: true }
    );
  }

  async updateDuration(userId: string, guildId: string, additionalSeconds: number): Promise<void> {
    await UserGuildStatsModel.updateOne(
      { userId, guildId },
      { $inc: { durationSeconds: additionalSeconds }, $set: { lastSeen: new Date() } },
      { upsert: true }
    );
  }
}

export const userGuildStatsRepository = new UserGuildStatsRepository();
