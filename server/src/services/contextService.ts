import { ContextEntry, CompactContextResponse, Task } from '../domain/types';
import { SamparkStore } from '../persistence/store';

export class ContextService {
  constructor(private store: SamparkStore) {}

  public getCompactContext(taskId: string, sinceVersion?: number): CompactContextResponse | null {
    const task = this.store.getTaskById(taskId);
    if (!task) return null;

    const deltaEntries = this.store.getContextEntries(taskId, sinceVersion);
    const allTaskEntries = this.store.getContextEntries(taskId);

    // Dependencies summary
    const dependencySummary = task.dependencyTaskIds
      .map((depId) => {
        const depTask = this.store.getTaskById(depId);
        return depTask ? { id: depTask.id, title: depTask.title, status: depTask.status } : null;
      })
      .filter((d): d is { id: string; title: string; status: any } => d !== null);

    // Latest test evidence
    const testEntries = allTaskEntries
      .filter((e) => e.kind === 'test_result')
      .sort((a, b) => b.version - a.version);
    const latestEvidence = testEntries.slice(0, 2);

    // Latest API contracts
    const apiContracts = allTaskEntries
      .filter((e) => e.kind === 'api_contract')
      .sort((a, b) => b.version - a.version);

    // Build human-readable compact brief
    const ownerAgent = task.ownerAgentId ? this.store.getAgentById(task.ownerAgentId) : null;
    const ownerName = ownerAgent ? ownerAgent.displayName : 'unassigned';

    let compactBrief = `Task "${task.title}" is currently ${task.status.toUpperCase()} (assigned to ${ownerName}). `;
    compactBrief += `Context version: v${task.contextVersion}. `;

    if (apiContracts.length > 0) {
      compactBrief += `Latest contract: "${apiContracts[0].title}" (v${apiContracts[0].version}). `;
    }

    if (latestEvidence.length > 0) {
      compactBrief += `Evidence: "${latestEvidence[0].title}" (${latestEvidence[0].summary}). `;
    } else {
      compactBrief += `Evidence: No test evidence published yet. `;
    }

    if (dependencySummary.length > 0) {
      const pendingDeps = dependencySummary.filter((d) => d.status !== 'done');
      if (pendingDeps.length > 0) {
        compactBrief += `Pending blockers: [${pendingDeps.map((d) => `${d.title} (${d.status})`).join(', ')}].`;
      } else {
        compactBrief += `All ${dependencySummary.length} dependency task(s) resolved.`;
      }
    }

    const payloadString = JSON.stringify({
      task,
      deltaEntries,
      dependencySummary,
      latestEvidence,
      compactBrief,
    });
    const estimatedBytes = Buffer.byteLength(payloadString, 'utf-8');

    return {
      task,
      currentVersion: task.contextVersion,
      deltaEntries,
      dependencySummary,
      latestEvidence,
      compactBrief,
      estimatedBytes,
    };
  }
}
