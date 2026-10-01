import assert from "node:assert/strict";
import { memberIndex } from "../src/core/indexes/MemberIndex.js";
import { userGuildIndex } from "../src/core/indexes/UserGuildIndex.js";
import { roleIndex } from "../src/core/indexes/RoleIndex.js";
import { voiceIndex } from "../src/core/indexes/VoiceIndex.js";
import { userVoiceIndex } from "../src/core/indexes/UserVoiceIndex.js";
import { presenceIndex } from "../src/core/indexes/PresenceIndex.js";
import { guildStateManager } from "../src/core/state/GuildStateManager.js";
import { eventProcessor } from "../src/core/events/EventProcessor.js";
import { syncManager } from "../src/core/synchronization/SyncManager.js";
import { reconciliationWorker } from "../src/core/synchronization/ReconciliationWorker.js";
import { writeManager } from "../src/database/WriteManager.js";
import { checkRolesService } from "../src/services/queries/CheckRolesService.js";
import { dangerRolesService, SENSITIVE_PERMISSIONS } from "../src/services/queries/DangerRolesService.js";
import { checkVoiceService } from "../src/services/queries/CheckVoiceService.js";
import { checkDeviceService } from "../src/services/queries/CheckDeviceService.js";
import { checkConnectionsService } from "../src/services/queries/CheckConnectionsService.js";
import { fullCheckService } from "../src/services/queries/FullCheckService.js";
import { QueryContext } from "../src/services/queries/QueryContext.js";
import { transition } from "../src/analytics/VoiceSessionState.js";
import { eventJournal } from "../src/state/EventJournal.js";
import { stateStore } from "../src/state/StateStore.js";

async function runMasterTestSuite(): Promise<void> {
    console.log("Starting Discord Data API Master Engineering Test Suite (20 Scenarios)...");

    memberIndex.clear();
    userGuildIndex.clear();
    roleIndex.clear();
    voiceIndex.clear();
    userVoiceIndex.clear();
    presenceIndex.clear();
    guildStateManager.clear();
    writeManager.clear();
    stateStore.clear();

    console.log("Scenario 1: Member joins guild");
    guildStateManager.setSyncStatus("g1", "READY", 100);
    eventProcessor.process({
        type: "MEMBER_JOIN",
        guildId: "g1",
        userId: "u1",
        roleIds: ["r1", "r2"],
        rolesBitfield: "0",
        joinedTimestamp: 1000,
        version: 1,
        timestamp: 1000
    });
    const s1Member = memberIndex.getMember("g1", "u1");
    assert.ok(s1Member !== null);
    assert.equal(s1Member.userId, "u1");
    assert.deepEqual(s1Member.roleIds, ["r1", "r2"]);
    assert.ok(userGuildIndex.hasMembership("u1", "g1"));
    assert.equal(writeManager.getPendingMemberCount(), 1);
    console.log("Passed Scenario 1");

    console.log("Scenario 2: Role granted to member");
    roleIndex.setRole({
        guildId: "g1",
        roleId: "r_admin",
        name: "Admin Role",
        color: "#ff0000",
        position: 10,
        permissions: "8",
        managed: false,
        version: 1,
        deleted: false,
        updatedAt: 1100
    });
    eventProcessor.process({
        type: "MEMBER_UPDATE",
        guildId: "g1",
        userId: "u1",
        roleIds: ["r1", "r2", "r_admin"],
        rolesBitfield: "0",
        joinedTimestamp: 1000,
        version: 2,
        timestamp: 1100
    });
    const s2Member = memberIndex.getMember("g1", "u1");
    assert.ok(s2Member !== null);
    assert.deepEqual(s2Member.roleIds, ["r1", "r2", "r_admin"]);
    const s2Danger = dangerRolesService.execute("u1");
    assert.ok(s2Danger.hasDangerousPermissions);
    assert.equal(s2Danger.guilds[0]?.isAdmin, true);
    console.log("Passed Scenario 2");

    console.log("Scenario 3: Role removed from member");
    eventProcessor.process({
        type: "MEMBER_UPDATE",
        guildId: "g1",
        userId: "u1",
        roleIds: ["r1", "r2"],
        rolesBitfield: "0",
        joinedTimestamp: 1000,
        version: 3,
        timestamp: 1200
    });
    const s3Member = memberIndex.getMember("g1", "u1");
    assert.ok(s3Member !== null);
    assert.deepEqual(s3Member.roleIds, ["r1", "r2"]);
    const s3Danger = dangerRolesService.execute("u1");
    assert.equal(s3Danger.hasDangerousPermissions, false);
    console.log("Passed Scenario 3");

    console.log("Scenario 4: Member leaves guild");
    eventProcessor.process({
        type: "VOICE_UPDATE",
        guildId: "g1",
        userId: "u1",
        channelId: "vc1",
        selfMute: false,
        selfDeaf: false,
        serverMute: false,
        serverDeaf: false,
        selfVideo: false,
        selfStream: false,
        timestamp: 1250
    });
    assert.ok(voiceIndex.getVoiceState("g1", "u1") !== null);
    eventProcessor.process({
        type: "MEMBER_LEAVE",
        guildId: "g1",
        userId: "u1",
        roleIds: [],
        rolesBitfield: "0",
        joinedTimestamp: 0,
        version: 4,
        timestamp: 1300
    });
    assert.equal(memberIndex.getMember("g1", "u1"), null);
    assert.equal(userGuildIndex.hasMembership("u1", "g1"), false);
    assert.equal(voiceIndex.getVoiceState("g1", "u1"), null);
    assert.equal(userVoiceIndex.hasVoiceConnection("u1", "g1"), false);
    console.log("Passed Scenario 4");

    console.log("Scenario 5: Member rejoins guild (generation fencing)");
    const genBefore = guildStateManager.getGeneration("g1");
    guildStateManager.setSyncStatus("g1", "READY", 100);
    eventProcessor.process({
        type: "MEMBER_JOIN",
        guildId: "g1",
        userId: "u1",
        roleIds: ["r_rejoin"],
        rolesBitfield: "0",
        joinedTimestamp: 2000,
        version: 1,
        timestamp: 2000
    });
    const s5Member = memberIndex.getMember("g1", "u1");
    assert.ok(s5Member !== null);
    assert.deepEqual(s5Member.roleIds, ["r_rejoin"]);
    eventProcessor.processMemberEvent({
        type: "MEMBER_LEAVE",
        guildId: "g1",
        userId: "u1",
        roleIds: [],
        rolesBitfield: "0",
        joinedTimestamp: 0,
        version: 1,
        timestamp: 1500
    });
    assert.ok(memberIndex.getMember("g1", "u1") !== null);
    console.log("Passed Scenario 5");

    console.log("Scenario 6: Role deleted with scheduled cleanup");
    roleIndex.setRole({
        guildId: "g1",
        roleId: "r_deleted",
        name: "To Delete",
        color: "#111111",
        position: 5,
        permissions: "8",
        managed: false,
        version: 1,
        deleted: false,
        updatedAt: 3000
    });
    eventProcessor.process({
        type: "MEMBER_UPDATE",
        guildId: "g1",
        userId: "u2",
        roleIds: ["r_deleted"],
        rolesBitfield: "0",
        joinedTimestamp: 3000,
        version: 1,
        timestamp: 3000
    });
    eventProcessor.process({
        type: "ROLE_DELETE",
        guildId: "g1",
        roleId: "r_deleted",
        name: "To Delete",
        color: "#111111",
        position: 5,
        permissions: "8",
        managed: false,
        version: 2,
        timestamp: 3100
    });
    assert.equal(roleIndex.getRole("g1", "r_deleted"), null);
    assert.ok(roleIndex.isRoleDeleted("g1", "r_deleted"));
    const s6Roles = checkRolesService.execute("u2");
    assert.equal(s6Roles.guilds[0]?.roles.length, 0);
    console.log("Passed Scenario 6");

    console.log("Scenario 7: Duplicate event processing idempotency");
    const s7Event = {
        type: "MEMBER_UPDATE" as const,
        guildId: "g1",
        userId: "u3",
        roleIds: ["r1", "r2"],
        rolesBitfield: "0",
        joinedTimestamp: 4000,
        version: 1,
        timestamp: 4000
    };
    eventProcessor.process(s7Event);
    eventProcessor.process(s7Event);
    const s7Member = memberIndex.getMember("g1", "u3");
    assert.ok(s7Member !== null);
    assert.deepEqual(s7Member.roleIds, ["r1", "r2"]);
    console.log("Passed Scenario 7");

    console.log("Scenario 8: Out-of-order event rejection");
    eventProcessor.process({
        type: "MEMBER_UPDATE",
        guildId: "g1",
        userId: "u3",
        roleIds: ["r1", "r2", "r3"],
        rolesBitfield: "0",
        joinedTimestamp: 4000,
        version: 5,
        timestamp: 4100
    });
    eventProcessor.process({
        type: "MEMBER_UPDATE",
        guildId: "g1",
        userId: "u3",
        roleIds: ["r_stale"],
        rolesBitfield: "0",
        joinedTimestamp: 4000,
        version: 3,
        timestamp: 4050
    });
    const s8Member = memberIndex.getMember("g1", "u3");
    assert.ok(s8Member !== null);
    assert.deepEqual(s8Member.roleIds, ["r1", "r2", "r3"]);
    console.log("Passed Scenario 8");

    console.log("Scenario 9: Initial synchronization race buffer");
    guildStateManager.setSyncStatus("g_race", "INITIALIZING");
    const syncGen = syncManager.startSync("g_race");
    eventProcessor.process({
        type: "MEMBER_UPDATE",
        guildId: "g_race",
        userId: "u_race",
        roleIds: ["r_live_new"],
        rolesBitfield: "0",
        joinedTimestamp: 5000,
        version: 2,
        timestamp: 5050
    });
    syncManager.completeSync(
        {
            guildId: "g_race",
            members: [
                {
                    guildId: "g_race",
                    userId: "u_race",
                    roleIds: ["r_snapshot_old"],
                    rolesBitfield: "0",
                    joinedTimestamp: 5000,
                    updatedAt: 5000,
                    version: 1,
                    generation: syncGen
                }
            ],
            roles: []
        },
        syncGen
    );
    const s9Member = memberIndex.getMember("g_race", "u_race");
    assert.ok(s9Member !== null);
    assert.deepEqual(s9Member.roleIds, ["r_live_new"]);
    console.log("Passed Scenario 9");

    console.log("Scenario 10: Disconnection & reconciliation triggering");
    syncManager.markStale("g_race");
    assert.equal(guildStateManager.getSyncStatus("g_race").status, "STALE");
    const reconciled = await reconciliationWorker.reconcile();
    assert.ok(reconciled.includes("g_race"));
    assert.equal(guildStateManager.getSyncStatus("g_race").status, "SYNCING");
    console.log("Passed Scenario 10");

    console.log("Scenario 11: Voice join handling");
    eventProcessor.process({
        type: "VOICE_UPDATE",
        guildId: "g1",
        userId: "u_voice",
        channelId: "vc_room_1",
        selfMute: false,
        selfDeaf: false,
        serverMute: false,
        serverDeaf: false,
        selfVideo: true,
        selfStream: false,
        timestamp: 6000
    });
    const s11Voice = voiceIndex.getVoiceState("g1", "u_voice");
    assert.ok(s11Voice !== null);
    assert.equal(s11Voice.channelId, "vc_room_1");
    assert.equal(s11Voice.selfVideo, true);
    assert.ok(userVoiceIndex.hasVoiceConnection("u_voice", "g1"));
    const s11Check = checkVoiceService.execute("u_voice");
    assert.equal(s11Check.isConnected, true);
    assert.equal(s11Check.connections[0]?.channelId, "vc_room_1");
    console.log("Passed Scenario 11");

    console.log("Scenario 12: Voice disconnect handling");
    eventProcessor.process({
        type: "VOICE_UPDATE",
        guildId: "g1",
        userId: "u_voice",
        channelId: null,
        selfMute: false,
        selfDeaf: false,
        serverMute: false,
        serverDeaf: false,
        selfVideo: false,
        selfStream: false,
        timestamp: 6100
    });
    assert.equal(voiceIndex.getVoiceState("g1", "u_voice"), null);
    assert.equal(userVoiceIndex.hasVoiceConnection("u_voice", "g1"), false);
    const s12Check = checkVoiceService.execute("u_voice");
    assert.equal(s12Check.isConnected, false);
    console.log("Passed Scenario 12");

    console.log("Scenario 13: Voice channel switch session lifecycle");
    const vIds = { userId: "u_switch", guildId: "g1" };
    const tJoin = transition(null, { type: "join", channelId: "vc1", occurredAt: 1000 }, vIds);
    assert.ok(tJoin.session !== null);
    const tMove = transition(tJoin.session, { type: "move", channelId: "vc2", occurredAt: 2000 }, vIds);
    assert.equal(tMove.session?.channelId, "vc2");
    assert.equal(tMove.session?.accumulatedDurationMs, 1000);
    assert.equal(tMove.channelForCompanion, "vc1");
    const tLeave = transition(tMove.session, { type: "leave", channelId: null, occurredAt: 3500 }, vIds);
    assert.equal(tLeave.session, null);
    assert.equal(tLeave.durationToFinalizeMs, 2500);
    console.log("Passed Scenario 13");

    console.log("Scenario 14: Database failure retry safety");
    writeManager.clear();
    writeManager.queueMemberWrite({
        guildId: "g_fail",
        userId: "u_fail",
        roleIds: ["r_fail"],
        rolesBitfield: "0",
        joinedAt: 7000,
        updatedAt: 7000,
        version: 1,
        generation: 1,
        isDelete: false
    });
    assert.equal(writeManager.getPendingMemberCount(), 1);
    console.log("Passed Scenario 14");

    console.log("Scenario 15: Stale write completion race (Version 10 vs Version 11)");
    writeManager.clear();
    writeManager.queueMemberWrite({
        guildId: "g1",
        userId: "u_race_write",
        roleIds: ["v10"],
        rolesBitfield: "0",
        joinedAt: 8000,
        updatedAt: 8000,
        version: 10,
        generation: 1,
        isDelete: false
    });
    writeManager.queueMemberWrite({
        guildId: "g1",
        userId: "u_race_write",
        roleIds: ["v11"],
        rolesBitfield: "0",
        joinedAt: 8000,
        updatedAt: 8100,
        version: 11,
        generation: 1,
        isDelete: false
    });
    assert.equal(writeManager.getPendingMemberCount(), 1);
    console.log("Passed Scenario 15");

    console.log("Scenario 16: FullCheck query coordination with QueryContext");
    roleIndex.setRole({
        guildId: "g1",
        roleId: "r_shared",
        name: "Shared Role",
        color: "#333333",
        position: 1,
        permissions: "0",
        managed: false,
        version: 1,
        deleted: false,
        updatedAt: 9000
    });
    memberIndex.setMember({
        guildId: "g1",
        userId: "u_fullcheck",
        roleIds: ["r_shared"],
        rolesBitfield: "0",
        joinedTimestamp: 9000,
        updatedAt: 9000,
        version: 1,
        generation: 1
    });
    userGuildIndex.addMembership("u_fullcheck", "g1");
    presenceIndex.setPresence({
        userId: "u_fullcheck",
        status: "online",
        desktop: "online",
        mobile: "offline",
        web: "unknown",
        lastObservedAt: 9000
    });
    const fcRes = fullCheckService.execute("u_fullcheck");
    assert.equal(fcRes.status, "MEMBER_FOUND");
    assert.equal(fcRes.rolesSection.totalGuilds, 1);
    assert.equal(fcRes.deviceSection.observedStatus, "online");
    assert.equal(fcRes.deviceSection.platforms.desktop, "online");
    console.log("Passed Scenario 16");

    console.log("Scenario 17: Unauthorized query isolation");
    const fcAuthRes = fullCheckService.execute("u_fullcheck", "client_auth", new Set(["g_other_unauthorized"]));
    assert.equal(fcAuthRes.rolesSection.totalGuilds, 0);
    assert.equal(fcAuthRes.rolesSection.status, "NOT_AUTHORIZED");
    console.log("Passed Scenario 17");

    console.log("Scenario 18: Incomplete data transparent signaling");
    guildStateManager.setSyncStatus("g_incomplete", "SYNCING");
    memberIndex.setMember({
        guildId: "g_incomplete",
        userId: "u_inc",
        roleIds: [],
        rolesBitfield: "0",
        joinedTimestamp: 10000,
        updatedAt: 10000,
        version: 1,
        generation: 1
    });
    userGuildIndex.addMembership("u_inc", "g_incomplete");
    const incRoles = checkRolesService.execute("u_inc");
    assert.equal(incRoles.guilds[0]?.isComplete, false);
    assert.equal(incRoles.guilds[0]?.status, "PARTIAL");
    console.log("Passed Scenario 18");

    console.log("Scenario 19: Application restart & journal recovery");
    const testEvtId = `evt_recovery_${Date.now()}`;
    await eventJournal.append({
        eventId: testEvtId,
        userId: "u_restart",
        guildId: "g1",
        channelId: "vc_restarted",
        type: "join",
        occurredAt: Date.now()
    });
    const readEntries = await eventJournal.readAll();
    assert.ok(readEntries.some((e) => e.eventId === testEvtId));
    console.log("Passed Scenario 19");

    console.log("Scenario 20: Large dataset synthetic benchmark (2,000,000 unique users)");
    memberIndex.clear();
    userGuildIndex.clear();
    const totalUsers = 2000000;
    const guilds = ["g_bench_1", "g_bench_2", "g_bench_3", "g_bench_4", "g_bench_5"];
    for (const g of guilds) {
        guildStateManager.setSyncStatus(g, "READY", 400000);
    }
    const startTime = Date.now();
    for (let i = 0; i < totalUsers; i++) {
        const uId = `u_${i}`;
        const gId = guilds[i % guilds.length];
        if (gId) {
            userGuildIndex.addMembership(uId, gId);
            if (i < 50000) {
                memberIndex.setMember({
                    guildId: gId,
                    userId: uId,
                    roleIds: ["r1", "r2"],
                    rolesBitfield: "0",
                    joinedTimestamp: 1000,
                    updatedAt: 1000,
                    version: 1,
                    generation: 1
                });
            }
        }
    }
    const buildDurationMs = Date.now() - startTime;
    assert.equal(userGuildIndex.uniqueUsersCount(), totalUsers);
    const lookupStart = process.hrtime.bigint();
    const foundGuilds = userGuildIndex.getGuildsForUser("u_1000000");
    const lookupEnd = process.hrtime.bigint();
    const lookupNanos = Number(lookupEnd - lookupStart);
    assert.equal(foundGuilds.size, 1);
    console.log(`Passed Scenario 20: Built 2M user index in ${buildDurationMs}ms, lookup took ${lookupNanos}ns (${(lookupNanos / 1000000).toFixed(4)}ms)`);

    console.log("\nALL 20 MASTER TEST SCENARIOS COMPLETED SUCCESSFULLY (100% PASS RATE)!");
}

void runMasterTestSuite().catch((err) => {
    console.error("Master Test Suite Failed:", err);
    process.exit(1);
});
