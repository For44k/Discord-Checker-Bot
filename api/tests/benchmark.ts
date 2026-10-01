import { memberIndex } from "../src/core/indexes/MemberIndex.js";
import { userGuildIndex } from "../src/core/indexes/UserGuildIndex.js";
import { roleIndex } from "../src/core/indexes/RoleIndex.js";
import { voiceIndex } from "../src/core/indexes/VoiceIndex.js";
import { userVoiceIndex } from "../src/core/indexes/UserVoiceIndex.js";
import { presenceIndex } from "../src/core/indexes/PresenceIndex.js";
import { guildStateManager } from "../src/core/state/GuildStateManager.js";
import { eventProcessor } from "../src/core/events/EventProcessor.js";
import { checkRolesService } from "../src/services/queries/CheckRolesService.js";
import { dangerRolesService } from "../src/services/queries/DangerRolesService.js";
import { checkVoiceService } from "../src/services/queries/CheckVoiceService.js";
import { fullCheckService } from "../src/services/queries/FullCheckService.js";

function calculatePercentiles(latenciesNs: number[]): { p50Ms: number; p95Ms: number; p99Ms: number } {
    latenciesNs.sort((a, b) => a - b);
    const p50 = latenciesNs[Math.floor(latenciesNs.length * 0.50)] ?? 0;
    const p95 = latenciesNs[Math.floor(latenciesNs.length * 0.95)] ?? 0;
    const p99 = latenciesNs[Math.floor(latenciesNs.length * 0.99)] ?? 0;
    return {
        p50Ms: parseFloat((p50 / 1_000_000).toFixed(4)),
        p95Ms: parseFloat((p95 / 1_000_000).toFixed(4)),
        p99Ms: parseFloat((p99 / 1_000_000).toFixed(4))
    };
}

async function runBenchmarks(): Promise<void> {
    console.log("=== PERFORMANCE & STORAGE BENCHMARKS ===");

    memberIndex.clear();
    userGuildIndex.clear();
    roleIndex.clear();
    voiceIndex.clear();
    userVoiceIndex.clear();
    presenceIndex.clear();
    guildStateManager.clear();

    const guildIds = ["g_bench_1", "g_bench_2", "g_bench_3", "g_bench_4", "g_bench_5", "g_bench_6", "g_bench_7", "g_bench_8", "g_bench_9", "g_bench_10"];
    for (const gid of guildIds) {
        guildStateManager.setSyncStatus(gid, "READY", 100000);
        for (let r = 1; r <= 20; r++) {
            roleIndex.setRole({
                guildId: gid,
                roleId: `role_${r}`,
                name: `Role ${r}`,
                color: "#123456",
                position: r,
                permissions: r === 20 ? "8" : "32",
                managed: false,
                version: 1,
                deleted: false,
                updatedAt: Date.now()
            });
        }
    }

    const testUsersCount = 100000;
    for (let i = 0; i < testUsersCount; i++) {
        const uid = `user_${i}`;
        const gid = guildIds[i % guildIds.length];
        if (gid) {
            userGuildIndex.addMembership(uid, gid);
            memberIndex.setMember({
                guildId: gid,
                userId: uid,
                roleIds: ["role_1", "role_2", i % 10 === 0 ? "role_20" : "role_3"],
                rolesBitfield: "0",
                joinedTimestamp: 1000,
                updatedAt: 1000,
                version: 1,
                generation: 1
            });
            if (i % 20 === 0) {
                voiceIndex.setVoiceState({
                    guildId: gid,
                    userId: uid,
                    channelId: `vc_${i % 5}`,
                    observedJoinedAt: Date.now(),
                    selfMute: false,
                    selfDeaf: false,
                    serverMute: false,
                    serverDeaf: false,
                    selfVideo: false,
                    selfStream: false,
                    updatedAt: Date.now()
                });
                userVoiceIndex.addVoiceConnection(uid, gid);
            }
        }
    }

    const iterations = 10000;

    const memberIndexLatencies: number[] = [];
    for (let i = 0; i < iterations; i++) {
        const uid = `user_${i % testUsersCount}`;
        const gid = guildIds[i % guildIds.length] || "g_bench_1";
        const start = process.hrtime.bigint();
        memberIndex.getMember(gid, uid);
        const end = process.hrtime.bigint();
        memberIndexLatencies.push(Number(end - start));
    }
    const miPercentiles = calculatePercentiles(memberIndexLatencies);
    console.log(`1. MemberIndex Lookup (10k ops): p50=${miPercentiles.p50Ms}ms, p95=${miPercentiles.p95Ms}ms, p99=${miPercentiles.p99Ms}ms`);

    const userGuildLatencies: number[] = [];
    for (let i = 0; i < iterations; i++) {
        const uid = `user_${i % testUsersCount}`;
        const start = process.hrtime.bigint();
        userGuildIndex.getGuildsForUser(uid);
        const end = process.hrtime.bigint();
        userGuildLatencies.push(Number(end - start));
    }
    const ugPercentiles = calculatePercentiles(userGuildLatencies);
    console.log(`2. UserGuildIndex Lookup (10k ops): p50=${ugPercentiles.p50Ms}ms, p95=${ugPercentiles.p95Ms}ms, p99=${ugPercentiles.p99Ms}ms`);

    const checkRolesLatencies: number[] = [];
    for (let i = 0; i < iterations; i++) {
        const uid = `user_${i % testUsersCount}`;
        const start = process.hrtime.bigint();
        checkRolesService.execute(uid);
        const end = process.hrtime.bigint();
        checkRolesLatencies.push(Number(end - start));
    }
    const crPercentiles = calculatePercentiles(checkRolesLatencies);
    console.log(`3. CheckRoles Service (10k ops): p50=${crPercentiles.p50Ms}ms, p95=${crPercentiles.p95Ms}ms, p99=${crPercentiles.p99Ms}ms`);

    const dangerRolesLatencies: number[] = [];
    for (let i = 0; i < iterations; i++) {
        const uid = `user_${i % testUsersCount}`;
        const start = process.hrtime.bigint();
        dangerRolesService.execute(uid);
        const end = process.hrtime.bigint();
        dangerRolesLatencies.push(Number(end - start));
    }
    const drPercentiles = calculatePercentiles(dangerRolesLatencies);
    console.log(`4. DangerRoles Service (10k ops): p50=${drPercentiles.p50Ms}ms, p95=${drPercentiles.p95Ms}ms, p99=${drPercentiles.p99Ms}ms`);

    const checkVoiceLatencies: number[] = [];
    for (let i = 0; i < iterations; i++) {
        const uid = `user_${i % testUsersCount}`;
        const start = process.hrtime.bigint();
        checkVoiceService.execute(uid);
        const end = process.hrtime.bigint();
        checkVoiceLatencies.push(Number(end - start));
    }
    const cvPercentiles = calculatePercentiles(checkVoiceLatencies);
    console.log(`5. CheckVoice Service (10k ops): p50=${cvPercentiles.p50Ms}ms, p95=${cvPercentiles.p95Ms}ms, p99=${cvPercentiles.p99Ms}ms`);

    const fullCheckLatencies: number[] = [];
    for (let i = 0; i < iterations; i++) {
        const uid = `user_${i % testUsersCount}`;
        const start = process.hrtime.bigint();
        fullCheckService.execute(uid);
        const end = process.hrtime.bigint();
        fullCheckLatencies.push(Number(end - start));
    }
    const fcPercentiles = calculatePercentiles(fullCheckLatencies);
    console.log(`6. FullCheck Service Coordinator (10k ops): p50=${fcPercentiles.p50Ms}ms, p95=${fcPercentiles.p95Ms}ms, p99=${fcPercentiles.p99Ms}ms`);

    const updateStart = process.hrtime.bigint();
    for (let i = 0; i < 50000; i++) {
        const uid = `user_${i}`;
        const gid = guildIds[i % guildIds.length] || "g_bench_1";
        eventProcessor.process({
            type: "MEMBER_UPDATE",
            guildId: gid,
            userId: uid,
            roleIds: ["role_1", "role_2", "role_5"],
            rolesBitfield: "0",
            joinedTimestamp: 1000,
            version: 2,
            timestamp: Date.now()
        });
    }
    const updateEnd = process.hrtime.bigint();
    const updateTotalMs = Number(updateEnd - updateStart) / 1_000_000;
    const updatesPerSec = Math.floor((50000 / updateTotalMs) * 1000);
    console.log(`7. Member Role Update Throughput: ${updatesPerSec.toLocaleString()} ops/sec (50k updates in ${updateTotalMs.toFixed(2)}ms)`);

    const memoryUsage = process.memoryUsage();
    console.log(`\nMemory Utilization (100k full records in RAM):`);
    console.log(`- Heap Used: ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`- Resident Set Size (RSS): ${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`);

    console.log(`\nMongoDB 512MB Storage Strategy Analysis:`);
    const avgMemberDocBytes = 145;
    const avgIndexBytesPerDoc = 55;
    const totalBytesPerMember = avgMemberDocBytes + avgIndexBytesPerDoc;
    const maxMembersIn512MB = Math.floor((512 * 1024 * 1024 * 0.85) / totalBytesPerMember);
    console.log(`- Average Compact Member Document Size: ~${avgMemberDocBytes} bytes`);
    console.log(`- Average Compound Index Size per Document: ~${avgIndexBytesPerDoc} bytes`);
    console.log(`- Max Durable Memberships fitting in 512MB Budget (85% utilization target): ${maxMembersIn512MB.toLocaleString()} memberships`);
    console.log(`- Recommendation for >2,000,000 users with cross-server memberships: Upgrade MongoDB cluster tier beyond 512MB or deploy selective LRU working set persistence.`);
}

void runBenchmarks();
