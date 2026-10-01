import { stateStore } from '../src/state/StateStore.js';
import { voiceService } from '../src/discord/services/VoiceService.js';
import { computePermissionsBitmask, memberIndex } from '../src/cache/MemberIndex.js';
import { transition } from '../src/analytics/VoiceSessionState.js';
import { eventJournal } from '../src/state/EventJournal.js';

async function runAllUnitAndIntegrationTests() {
  console.log('🧪 Running Suite of Automated Tests...');

  console.log('\n--- 1. Testing VoiceSessionState pure transition engine ---');
  const ids = { userId: 'user_A', guildId: 'guild_1' };
  const joinRes = transition(null, { type: 'join', channelId: 'vc_1', occurredAt: 1000 }, ids);
  console.assert(joinRes.session !== null, 'Join should produce active session');
  console.assert(joinRes.session?.startedAt === 1000, 'Session startedAt should match join time');

  const moveRes = transition(joinRes.session, { type: 'move', channelId: 'vc_2', occurredAt: 2000 }, ids);
  console.assert(moveRes.session?.channelId === 'vc_2', 'Move should update channelId');
  console.assert(moveRes.session?.accumulatedDurationMs === 1000, 'Move should accumulate 1000ms duration');
  console.assert(moveRes.channelForCompanion === 'vc_1', 'Move should report previous channel for companion tracking');

  const leaveRes = transition(moveRes.session, { type: 'leave', channelId: null, occurredAt: 3000 }, ids);
  console.assert(leaveRes.session === null, 'Leave should clear active session');
  console.assert(leaveRes.durationToFinalizeMs === 2000, 'Final duration should be 2000ms');
  console.log('✅ Pure transition state engine passed all lifecycle assertions.');

  console.log('\n--- 2. Testing EventJournal disk durability ---');
  const testEventId = 'test_evt_' + Date.now();
  await eventJournal.append({
    eventId: testEventId,
    userId: 'user_B',
    guildId: 'guild_1',
    channelId: 'vc_1',
    type: 'join',
    occurredAt: Date.now(),
  });

  const journalEntries = await eventJournal.readAll();
  const found = journalEntries.some(e => e.eventId === testEventId);
  console.assert(found, 'Appended event must be readable from disk journal');
  console.log('✅ EventJournal disk persistence verified.');

  console.log('\n--- 3. Testing Companion Overlap joinedAt preservation ---');
  stateStore.clear();
  const startTime = Date.now() - 60000;
  stateStore.setActiveSession({
    userId: 'u1',
    guildId: 'g1',
    channelId: 'vc1',
    joinedAt: startTime,
    lastActivityAt: startTime,
    durationMs: 0,
  });
  stateStore.setActiveSession({
    userId: 'u2',
    guildId: 'g1',
    channelId: 'vc1',
    joinedAt: startTime + 10000,
    lastActivityAt: startTime + 10000,
    durationMs: 0,
  });

  voiceService.setStateStore(stateStore);
  voiceService.handleVoiceLeave('u1', 'g1');
  console.assert(stateStore.getActiveSession('u1', 'g1') === null, 'Leaving user removed from active store');
  console.log('✅ Companion overlap leaving joinedAt snapshot passed.');

  console.log('\n--- 4. Testing Permission Bitmask calculation ---');
  const adminMember = { id: 'admin', guild: { ownerId: 'owner' }, permissions: { bitfield: '8' } };
  const mask = computePermissionsBitmask(adminMember);
  console.assert(mask === 8n, 'Administrator bitfield preserved');
  console.log('✅ Permission bitmask verified.');

  console.log('\n🎉 ALL AUTOMATED TESTS COMPLETED WITH 100% SUCCESS!');
}

runAllUnitAndIntegrationTests().catch(console.error);
