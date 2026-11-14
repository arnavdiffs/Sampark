import { Agent, Task, RoutingCandidateScore, RoutingRecommendation } from '../domain/types';
import { SamparkStore } from '../persistence/store';

export class RoutingService {
  constructor(private store: SamparkStore) {}

  public getRecommendationForTask(taskId: string): RoutingRecommendation {
    const task = this.store.getTaskById(taskId);
    if (!task) {
      return {
        taskId,
        recommendedAgent: null,
        explanation: `Task '${taskId}' not found.`,
        rankedCandidates: [],
      };
    }

    const agents = this.store.getAgents();
    const rankedCandidates: RoutingCandidateScore[] = [];

    for (const agent of agents) {
      // 1. Hard disqualifiers
      if (agent.revoked) continue;
      const isExpired = new Date(agent.sessionExpiresAt).getTime() <= Date.now();
      if (isExpired) continue;
      if (agent.status === 'offline') continue;

      // Check required scope
      const matchesScope = agent.allowedScopes.includes(task.requiredScope);

      // Check capabilities
      const hasAllRequiredCapabilities = task.requiredCapabilities.every((cap) =>
        agent.capabilities.includes(cap)
      );
      const matchedCapsCount = task.requiredCapabilities.filter((cap) =>
        agent.capabilities.includes(cap)
      ).length;

      // Check capacity
      const remainingCapacity = agent.maxConcurrentTasks - agent.currentTaskCount;
      const hasCapacity = remainingCapacity > 0;

      // Status check
      const isOnlineOrIdle = agent.status === 'idle' || agent.status === 'online';

      // Scoring breakdown
      let capabilityScore = 0;
      if (hasAllRequiredCapabilities && task.requiredCapabilities.length > 0) {
        capabilityScore = 50 + matchedCapsCount * 10;
      } else if (matchedCapsCount > 0) {
        capabilityScore = matchedCapsCount * 10;
      }

      let scopeScore = matchesScope ? 25 : 0;
      let capacityScore = Math.max(0, remainingCapacity) * 8;

      let statusScore = 0;
      if (agent.status === 'idle') statusScore = 15;
      else if (agent.status === 'online') statusScore = 10;
      else if (agent.status === 'busy') statusScore = 3;

      let powerScoreWeight = agent.powerScore * 4;

      // Total score: heavily penalty if disqualified on hard constraints
      let totalScore = capabilityScore + scopeScore + capacityScore + statusScore + powerScoreWeight;

      // If missing scope, full required caps, or has 0 capacity, disqualify from top consideration
      const fullyEligible = matchesScope && hasAllRequiredCapabilities && hasCapacity;
      if (!fullyEligible) {
        totalScore = Math.floor(totalScore * 0.2); // drastically deprioritize ineligible candidates
      }

      rankedCandidates.push({
        agent,
        score: totalScore,
        matchesCapability: hasAllRequiredCapabilities,
        matchesScope,
        hasCapacity,
        isOnlineOrIdle,
        breakdown: {
          capabilityScore,
          scopeScore,
          capacityScore,
          statusScore,
          powerScore: powerScoreWeight,
        },
      });
    }

    // Sort descending by score, tie-break on powerScore, then displayName
    rankedCandidates.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.agent.powerScore !== a.agent.powerScore) return b.agent.powerScore - a.agent.powerScore;
      return a.agent.displayName.localeCompare(b.agent.displayName);
    });

    const eligibleCandidates = rankedCandidates.filter(
      (c) => c.matchesScope && c.matchesCapability && c.hasCapacity
    );

    const recommended = eligibleCandidates.length > 0 ? eligibleCandidates[0].agent : null;

    let explanation = '';
    if (recommended) {
      const top = eligibleCandidates[0];
      const remaining = top.agent.maxConcurrentTasks - top.agent.currentTaskCount;
      explanation = `${top.agent.displayName} (${top.agent.provider} - Simulated) is optimal (score: ${top.score}): 100% capability match ([${task.requiredCapabilities.join(', ')}]), matching scope '${task.requiredScope}', ${remaining} task slot(s) available, ${top.agent.status} status with power score ${top.agent.powerScore}/5.`;
    } else {
      explanation = `No fully eligible agent available. Required capabilities: [${task.requiredCapabilities.join(', ')}], Scope: '${task.requiredScope}'. All available agents lack either capability, scope, or concurrent capacity.`;
    }

    return {
      taskId,
      recommendedAgent: recommended,
      explanation,
      rankedCandidates,
    };
  }
}
