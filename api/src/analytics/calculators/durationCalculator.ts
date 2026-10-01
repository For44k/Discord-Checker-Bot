export function calculateDuration(seconds: number): string {
    if (!seconds || seconds <= 0) return '0s';
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    const parts: string[] = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (s > 0 || parts.length === 0) parts.push(`${s}s`);
    return parts.slice(0, 2).join(' ');
}

export function calculateCompatibility(
    user1Id: string,
    user2Id: string,
    sharedSeconds: number,
    mutualCount: number
): { score: number; rankTitle: string } {
    const p1 = parseInt(user1Id.slice(-4), 10) || 1;
    const p2 = parseInt(user2Id.slice(-4), 10) || 1;
    const base = Math.abs(p1 ^ p2);
    const baseScore = 40 + (base % 35);
    const voiceBonus = Math.min(25, Math.floor((sharedSeconds / 3600) * 2));
    const mutualBonus = Math.min(15, mutualCount * 3);

    const score = Math.min(100, baseScore + voiceBonus + mutualBonus);

    let rankTitle = 'Casual Strangers';
    if (score >= 90) rankTitle = 'Destined Soulmates';
    else if (score >= 75) rankTitle = 'Inseparable Duo';
    else if (score >= 60) rankTitle = 'Close Friends';
    else if (score >= 45) rankTitle = 'Good Acquaintances';

    return { score, rankTitle };
}
