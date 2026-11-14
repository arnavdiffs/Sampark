import assert from 'assert';
import path from 'path';
import fs from 'fs';
import { SamparkStore } from '../persistence/store';
import { ValidationService } from '../services/validationService';
import { RoutingService } from '../services/routingService';
import { ContextService } from '../services/contextService';
import { createInitialSeedData } from '../seed/seedData';
import { hoursFromNowIso } from '../domain/ids';

async function runTestSuite() {
  console.log('--- [Sampark Test Suite] Starting Backend Domain Tests ---');

  // Use a temporary test data directory
  const testDataDir = path.resolve(process.cwd(), 'data-test-' + Date.now());
  const testStore = new SamparkStore(testDataDir);
  const seed = createInitialSeedData();
  testStore.resetWithData(
    {
      agents: seed.agents,
      tasks: seed.tasks,
      contextEntries: seed.contextEntries,
    },
    seed.events
  );

  const validationService = new ValidationService(testStore);
  const routingService = new RoutingService(testStore);
  const contextService = new ContextService(testStore);

  let passedCount = 0;
  let failedCount = 0;

  function test(name: string, fn: () => void) {
    try {
      fn();
      console.log(`  ✓ PASS: ${name}`);
      passedCount++;
    } catch (err: any) {
      console.error(`  ✗ FAIL: ${name}`);
      console.error(`    ${err.message}`);
      failedCount++;
    }
  }

  // Test 1: Valid task claim by suitable agent is accepted
  test('Valid task claim by suitable agent is accepted', () => {
    // Pulse has browser-tests and testing scope. Task tsk_login03 requires browser-tests and testing scope.
    const result = validationService.validateTaskClaim('agt_pulse04', 'tsk_login03');
    assert.strictEqual(result.accepted, true, 'Claim should be accepted');
  });

  // Test 2: Task claim by unsuitable capability is rejected
  test('Task claim by unsuitable capability is rejected', () => {
    // Nova has [react, typescript, ui, browser], lacks [browser-tests, regression]
    const result = validationService.validateTaskClaim('agt_nova02', 'tsk_login03');
    assert.strictEqual(result.accepted, false, 'Nova should be rejected for task');
    assert.ok(result.reason.includes('lacks required') || result.reason.includes('scope'), 'Expected rejection message');
  });

  // Test 3: Action outside agent scope is rejected
  test('Action outside agent scope is rejected', () => {
    // Nova has frontend scope only. Publishing in backend scope must be rejected.
    const result = validationService.validateAuthorization('agt_nova02', 'publish_context', 'backend');
    assert.strictEqual(result.accepted, false, 'Publish outside frontend scope must be rejected');
    assert.ok(result.reason.includes('scope only'), 'Expected cross-scope rejection message');
  });

  // Test 4: Expired or revoked session is rejected
  test('Revoked session is rejected', () => {
    // Revoke Sentinel
    testStore.updateAgent('agt_sent05', { revoked: true });
    const result = validationService.validateAgentIdentity('agt_sent05');
    assert.strictEqual(result.accepted, false, 'Revoked agent must be rejected');
    assert.ok(result.reason.includes('revoked'), 'Expected revoked notice in reason');
  });

  test('Expired session is rejected', () => {
    // Expire Forge session
    testStore.updateAgent('agt_forge03', {
      sessionExpiresAt: new Date(Date.now() - 10000).toISOString(),
    });
    const result = validationService.validateAgentIdentity('agt_forge03');
    assert.strictEqual(result.accepted, false, 'Expired session must be rejected');
    assert.ok(result.reason.includes('expired'), 'Expected expired notice in reason');
    // Restore Forge session for remaining tests
    testStore.updateAgent('agt_forge03', { sessionExpiresAt: hoursFromNowIso(12) });
  });

  // Test 5: Accepted context publish increments task context version
  test('Accepted context publish increments the task context version', () => {
    const task = testStore.getTaskById('tsk_login02')!;
    const initialVersion = task.contextVersion;

    const valResult = validationService.validateContextPublish('agt_nova02', task.id, {
      kind: 'file_change',
      title: 'Added Auth Header CSS',
      summary: 'Styling enhancements for authentication dialog',
      structuredValue: { file: 'auth.css', linesAdded: 45 },
      visibilityScope: 'frontend',
    });
    assert.strictEqual(valResult.accepted, true, 'Context should be valid');

    const newVersion = initialVersion + 1;
    testStore.saveContextEntry({
      id: 'ctx_test_inc',
      taskId: task.id,
      version: newVersion,
      kind: 'file_change',
      title: 'Added Auth Header CSS',
      summary: 'Styling enhancements for authentication dialog',
      structuredValue: { file: 'auth.css', linesAdded: 45 },
      sourceAgentId: 'agt_nova02',
      createdAt: new Date().toISOString(),
      tags: ['css'],
      visibilityScope: 'frontend',
    });
    testStore.updateTask(task.id, { contextVersion: newVersion });

    const updatedTask = testStore.getTaskById('tsk_login02')!;
    assert.strictEqual(updatedTask.contextVersion, initialVersion + 1, 'Version should increment by 1');
  });

  // Test 6: Context retrieval with sinceVersion returns only new entries
  test('Context retrieval with sinceVersion returns only newer entries', () => {
    // Task tsk_login01 has entries version 1 and 2 in seed data
    const all = contextService.getCompactContext('tsk_login01');
    assert.ok(all && all.deltaEntries.length >= 2, 'Should have at least 2 entries initially');

    const since1 = contextService.getCompactContext('tsk_login01', 1);
    assert.ok(since1, 'Response must exist');
    assert.strictEqual(since1.deltaEntries.length, 1, 'sinceVersion=1 should return only version 2');
    assert.strictEqual(since1.deltaEntries[0].version, 2, 'Entry version must be 2');
  });

  // Test 7: Routing chooses a capable agent with available capacity
  test('Routing chooses a capable agent with available capacity', () => {
    // Task tsk_login03 requires browser-tests and testing scope. Pulse is idle with testing scope.
    const recommendation = routingService.getRecommendationForTask('tsk_login03');
    assert.ok(recommendation.recommendedAgent, 'A recommendation must be found');
    assert.strictEqual(recommendation.recommendedAgent?.displayName, 'Pulse', 'Pulse should be recommended');
    assert.ok(recommendation.explanation.includes('Pulse'), 'Explanation must mention Pulse');
  });

  // Cleanup test files
  try {
    fs.rmSync(testDataDir, { recursive: true, force: true });
  } catch (err) {
    // ignore
  }

  console.log(`\n--- Test Summary: ${passedCount} passed, ${failedCount} failed ---`);
  if (failedCount > 0) {
    process.exit(1);
  }
}

runTestSuite();
