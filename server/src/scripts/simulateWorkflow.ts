import { store } from '../persistence/store';
import { initializeStoreIfEmpty } from '../seed/seedData';
import { ValidationService } from '../services/validationService';
import { RoutingService } from '../services/routingService';
import { ContextService } from '../services/contextService';
import { MockAgentAdapter } from '../adapters/MockAgentAdapter';

async function runCliSimulation() {
  console.log('=== [Sampark] Running Full Multi-Agent Simulation Workflow ===\n');

  initializeStoreIfEmpty(store);

  const validationService = new ValidationService(store);
  const routingService = new RoutingService(store);
  const contextService = new ContextService(store);

  // 1. Coordinator inspects tasks
  console.log('Step 1: Atlas (Coordinator) evaluates unassigned tasks...');
  const testTask = store.getTaskById('tsk_login03');
  if (!testTask) {
    console.error('Task tsk_login03 not found');
    return;
  }
  console.log(`  Found task: "${testTask.title}" (Scope: ${testTask.requiredScope})`);

  // 2. Deterministic routing recommendation
  console.log('\nStep 2: Computing deterministic routing recommendation...');
  const recommendation = routingService.getRecommendationForTask(testTask.id);
  console.log(`  Recommended Agent: ${recommendation.recommendedAgent?.displayName} (${recommendation.recommendedAgent?.provider})`);
  console.log(`  Routing Explanation: ${recommendation.explanation}`);

  // 3. Pulse claims task
  console.log('\nStep 3: Pulse claims the task with browser-tests capability...');
  const claimResult = validationService.validateTaskClaim('agt_pulse04', testTask.id);
  if (claimResult.accepted) {
    store.updateTask(testTask.id, {
      ownerAgentId: 'agt_pulse04',
      status: 'in_progress',
    });
    store.updateAgent('agt_pulse04', { currentTaskCount: 1, status: 'busy' });
    console.log(`  ✓ Claim accepted: ${claimResult.reason}`);
  }

  // 4. Pulse publishes test evidence
  console.log('\nStep 4: Pulse executes tests and publishes structured evidence...');
  const pulseAdapter = new MockAgentAdapter('Claude Code', store, validationService, contextService);
  const publishResult = await pulseAdapter.publishContext('agt_pulse04', testTask.id, {
    kind: 'test_result',
    title: 'E2E Headless Browser Pass Report',
    summary: '24/24 assertions passed across Chromium and Firefox.',
    structuredValue: {
      suite: 'login-flow-e2e',
      passed: 24,
      failed: 0,
      durationMs: 2310,
      environment: 'headless chromium',
    },
    tags: ['test_result', 'e2e'],
    visibilityScope: 'testing',
  });
  console.log(`  ✓ Context published: ${publishResult.reason}`);

  // 5. Nova attempts an unauthorized cross-scope update to backend contract
  console.log('\nStep 5: Nova (frontend scope only) attempts unauthorized database schema update...');
  const unauthorizedPublish = await pulseAdapter.publishContext('agt_nova02', 'tsk_login01', {
    kind: 'file_change',
    title: 'Unauthorized Database Migration Attempt',
    summary: 'Attempted to add foreign key to users table.',
    structuredValue: { sql: 'ALTER TABLE users ADD COLUMN phone VARCHAR(20);' },
    tags: ['db', 'schema'],
    visibilityScope: 'backend', // Nova has frontend scope only!
  });
  console.log(`  ✗ Validation Result: Accepted = ${unauthorizedPublish.accepted}`);
  console.log(`  ✗ Policy Engine Rejection Reason: ${unauthorizedPublish.reason}`);

  // 6. Compact Context Retrieval
  console.log('\nStep 6: Retrieving compact context delta (sinceVersion: 1)...');
  const delta = await pulseAdapter.fetchRelevantContext(testTask.id, 1);
  if (delta) {
    console.log(`  Current Version: v${delta.currentVersion}`);
    console.log(`  Delta Entries Returned: ${delta.deltaEntries.length}`);
    console.log(`  Estimated Payload Size: ${delta.estimatedBytes} bytes`);
    console.log(`  Compact Brief: "${delta.compactBrief}"`);
    console.log('  Notice: No raw chat transcripts or unbounded tokens were transmitted.');
  }

  console.log('\n=== Multi-Agent Simulation Workflow Completed Successfully ===');
}

runCliSimulation().catch(console.error);
