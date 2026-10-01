export class UserGuildIndex {
    private readonly userGuilds: Map<string, Set<string>> = new Map();

    public addMembership(userId: string, guildId: string): void {
        let set = this.userGuilds.get(userId);
        if (!set) {
            set = new Set();
            this.userGuilds.set(userId, set);
        }
        set.add(guildId);
    }

    public removeMembership(userId: string, guildId: string): boolean {
        const set = this.userGuilds.get(userId);
        if (!set) {
            return false;
        }
        const removed = set.delete(guildId);
        if (set.size === 0) {
            this.userGuilds.delete(userId);
        }
        return removed;
    }

    public removeGuild(guildId: string): void {
        for (const [userId, set] of this.userGuilds.entries()) {
            set.delete(guildId);
            if (set.size === 0) {
                this.userGuilds.delete(userId);
            }
        }
    }

    public getGuildsForUser(userId: string): Set<string> {
        return this.userGuilds.get(userId) ?? new Set();
    }

    public hasMembership(userId: string, guildId: string): boolean {
        return this.userGuilds.get(userId)?.has(guildId) ?? false;
    }

    public clear(): void {
        this.userGuilds.clear();
    }

    public uniqueUsersCount(): number {
        return this.userGuilds.size;
    }
}

export const userGuildIndex = new UserGuildIndex();
