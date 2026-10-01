export class UserVoiceIndex {
    private readonly userVoices: Map<string, Set<string>> = new Map();

    public addVoiceConnection(userId: string, guildId: string): void {
        let set = this.userVoices.get(userId);
        if (!set) {
            set = new Set();
            this.userVoices.set(userId, set);
        }
        set.add(guildId);
    }

    public removeVoiceConnection(userId: string, guildId: string): boolean {
        const set = this.userVoices.get(userId);
        if (!set) {
            return false;
        }
        const removed = set.delete(guildId);
        if (set.size === 0) {
            this.userVoices.delete(userId);
        }
        return removed;
    }

    public getGuildsForUser(userId: string): Set<string> {
        return this.userVoices.get(userId) ?? new Set();
    }

    public hasVoiceConnection(userId: string, guildId: string): boolean {
        return this.userVoices.get(userId)?.has(guildId) ?? false;
    }

    public removeGuild(guildId: string): void {
        for (const [userId, set] of this.userVoices.entries()) {
            set.delete(guildId);
            if (set.size === 0) {
                this.userVoices.delete(userId);
            }
        }
    }

    public clear(): void {
        this.userVoices.clear();
    }

    public activeUsersCount(): number {
        return this.userVoices.size;
    }
}

export const userVoiceIndex = new UserVoiceIndex();
