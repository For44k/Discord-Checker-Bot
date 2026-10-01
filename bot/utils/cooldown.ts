export interface CooldownResult {
    onCooldown: boolean;
    timeLeft: number;
    shouldNotify: boolean;
}

export class CooldownManager {
    private static cooldowns: Map<string, number> = new Map();
    private static lastNotified: Map<string, number> = new Map();
    private static spamTimestamps: Map<string, number[]> = new Map();
    private static spamPenalties: Map<string, number> = new Map();
    private static lastRateLimitNotified: Map<string, number> = new Map();
    private static cleanupInterval: NodeJS.Timeout | null = null;

    private static ensureCleanup() {
        if (this.cleanupInterval) return;
        this.cleanupInterval = setInterval(() => {
            const now = Date.now();
            for (const [key, expires] of this.cooldowns.entries()) {
                if (now > expires) this.cooldowns.delete(key);
            }
            for (const [key, notifiedAt] of this.lastNotified.entries()) {
                if (now - notifiedAt > 10000) this.lastNotified.delete(key);
            }
            for (const [userId, expires] of this.spamPenalties.entries()) {
                if (now > expires) this.spamPenalties.delete(userId);
            }
            for (const [userId, timestamps] of this.spamTimestamps.entries()) {
                const filtered = timestamps.filter((t) => now - t < 10000);
                if (filtered.length === 0) {
                    this.spamTimestamps.delete(userId);
                } else {
                    this.spamTimestamps.set(userId, filtered);
                }
            }
            for (const [userId, notifiedAt] of this.lastRateLimitNotified.entries()) {
                if (now - notifiedAt > 35000) this.lastRateLimitNotified.delete(userId);
            }
        }, 30000);
        if (this.cleanupInterval.unref) this.cleanupInterval.unref();
    }


    public static checkRateLimit(
        userId: string,
        maxCommands: number = 3,
        windowMs: number = 3000,
        penaltyMs: number = 30000
    ): CooldownResult {
        this.ensureCleanup();
        const now = Date.now();


        const penaltyExpires = this.spamPenalties.get(userId);
        if (penaltyExpires && now < penaltyExpires) {
            const timeLeft = Math.max(0.1, Number(((penaltyExpires - now) / 1000).toFixed(1)));
            const lastNotice = this.lastRateLimitNotified.get(userId) || 0;
            const shouldNotify = now - lastNotice > 3000;
            if (shouldNotify) {
                this.lastRateLimitNotified.set(userId, now);
            }
            return { onCooldown: true, timeLeft, shouldNotify };
        }


        const userTimestamps = (this.spamTimestamps.get(userId) || []).filter(
            (t) => now - t < windowMs
        );
        userTimestamps.push(now);
        this.spamTimestamps.set(userId, userTimestamps);


        if (userTimestamps.length > maxCommands) {
            this.spamPenalties.set(userId, now + penaltyMs);
            this.lastRateLimitNotified.set(userId, now);
            this.spamTimestamps.delete(userId);
            return {
                onCooldown: true,
                timeLeft: Number((penaltyMs / 1000).toFixed(1)),
                shouldNotify: true,
            };
        }

        return { onCooldown: false, timeLeft: 0, shouldNotify: false };
    }

    public static check(userId: string, commandName: string, cooldownMs: number = 600): CooldownResult {
        this.ensureCleanup();
        const key = `${userId}:${commandName}`;
        const now = Date.now();
        const expiration = this.cooldowns.get(key);

        if (expiration && now < expiration) {
            const timeLeft = Math.max(0.1, Number(((expiration - now) / 1000).toFixed(1)));
            const lastNotice = this.lastNotified.get(key) || 0;
            const shouldNotify = (now - lastNotice) > 2000;
            if (shouldNotify) {
                this.lastNotified.set(key, now);
            }
            return { onCooldown: true, timeLeft, shouldNotify };
        }

        this.cooldowns.set(key, now + cooldownMs);
        return { onCooldown: false, timeLeft: 0, shouldNotify: false };
    }

    public static clear(userId: string, commandName?: string): void {
        if (commandName) {
            this.cooldowns.delete(`${userId}:${commandName}`);
            this.lastNotified.delete(`${userId}:${commandName}`);
        } else {
            this.spamPenalties.delete(userId);
            this.spamTimestamps.delete(userId);
            this.lastRateLimitNotified.delete(userId);
        }
    }
}
