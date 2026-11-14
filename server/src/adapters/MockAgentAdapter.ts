import { AgentAdapter } from './AgentAdapter';
import { Agent, ContextEntry, CompactContextResponse, ValidationResult, AgentProvider } from '../domain/types';
import { SamparkStore } from '../persistence/store';
import { ValidationService } from '../services/validationService';
import { ContextService } from '../services/contextService';
import { generateId, nowIso, hoursFromNowIso } from '../domain/ids';

/**
 * MockAgentAdapter simulates an autonomous coding agent interacting
 * with the Sampark Control Plane. It demonstrates that incoming agent
 * actions pass through strict validation before updating shared state.
 */
export class MockAgentAdapter implements AgentAdapter {
  constructor(
    public readonly providerName: AgentProvider,
    private store: SamparkStore,
    private validationService: ValidationService,
    private contextService: ContextService
  ) {}

  public async registerAgent(
    config: Omit<Agent, 'id' | 'sessionId' | 'createdAt' | 'lastSeenAt' | 'sessionExpiresAt' | 'revoked'>
  ): Promise<Agent> {
    const agent: Agent = {
      ...config,
      id: generateId('agt'),
      sessionId: generateId('sess'),
      createdAt: nowIso(),
      lastSeenAt: nowIso(),
      sessionExpiresAt: hoursFromNowIso(12),
      revoked: false,
    };

    this.store.saveAgent(agent);
    this.validationService.logAuditEvent({
      eventType: 'AGENT_REGISTERED',
      actorAgentId: agent.id,
      accepted: true,
      reason: `Agent '${agent.displayName}' registered via ${this.providerName} mock adapter.`,
      payloadSummary: `${agent.displayName} (${agent.role}) joined mesh`,
      fullPayload: { agentId: agent.id, role: agent.role, provider: agent.provider },
    });

    return agent;
  }

  public async fetchRelevantContext(taskId: string, sinceVersion?: number): Promise<CompactContextResponse | null> {
    const response = this.contextService.getCompactContext(taskId, sinceVersion);
    return response;
  }

  public async publishContext(
    agentId: string,
    taskId: string,
    entry: Omit<ContextEntry, 'id' | 'version' | 'createdAt' | 'sourceAgentId' | 'taskId'>
  ): Promise<ValidationResult> {
    const valResult = this.validationService.validateContextPublish(agentId, taskId, entry);
    if (!valResult.accepted) {
      this.validationService.logAuditEvent({
        eventType: 'VALIDATION_REJECTED',
        actorAgentId: agentId,
        taskId,
        accepted: false,
        reason: valResult.reason,
        payloadSummary: `Rejected publish '${entry.title}' by agent ${agentId}`,
        fullPayload: { entry, warnings: valResult.warnings },
      });
      return valResult;
    }

    const task = this.store.getTaskById(taskId)!;
    const newVersion = task.contextVersion + 1;

    const fullEntry: ContextEntry = {
      ...entry,
      id: generateId('ctx'),
      taskId,
      version: newVersion,
      sourceAgentId: agentId,
      createdAt: nowIso(),
    };

    this.store.saveContextEntry(fullEntry);
    this.store.updateTask(taskId, {
      contextVersion: newVersion,
      updatedAt: nowIso(),
    });

    const isTest = entry.kind === 'test_result';
    this.validationService.logAuditEvent({
      eventType: isTest ? 'TEST_EVIDENCE_PUBLISHED' : 'CONTEXT_PUBLISHED',
      actorAgentId: agentId,
      taskId,
      accepted: true,
      reason: valResult.reason,
      payloadSummary: `Published v${newVersion}: ${entry.title}`,
      fullPayload: { contextEntryId: fullEntry.id, kind: fullEntry.kind, version: newVersion },
    });

    return {
      accepted: true,
      reason: `Context entry '${entry.title}' accepted as version ${newVersion}.`,
      warnings: [],
    };
  }

  public async heartbeat(agentId: string): Promise<boolean> {
    const agent = this.store.getAgentById(agentId);
    if (!agent || agent.revoked) return false;

    this.store.updateAgent(agentId, {
      lastSeenAt: nowIso(),
      sessionExpiresAt: hoursFromNowIso(12),
    });

    this.validationService.logAuditEvent({
      eventType: 'AGENT_HEARTBEAT',
      actorAgentId: agentId,
      accepted: true,
      reason: `Heartbeat acknowledged for ${agent.displayName}. Session extended.`,
      payloadSummary: `Heartbeat for ${agent.displayName}`,
      fullPayload: { agentId, renewedAt: nowIso() },
    });

    return true;
  }

  public async requestHandoff(
    senderAgentId: string,
    recipientAgentId: string,
    taskId: string,
    handoffNote: string
  ): Promise<ValidationResult> {
    const valResult = this.validationService.validateHandoff(senderAgentId, recipientAgentId, taskId, handoffNote);
    if (!valResult.accepted) {
      this.validationService.logAuditEvent({
        eventType: 'VALIDATION_REJECTED',
        actorAgentId: senderAgentId,
        targetAgentId: recipientAgentId,
        taskId,
        accepted: false,
        reason: valResult.reason,
        payloadSummary: `Handoff rejected for task ${taskId}`,
        fullPayload: { senderAgentId, recipientAgentId, taskId, handoffNote },
      });
      return valResult;
    }

    const task = this.store.getTaskById(taskId)!;
    const sender = this.store.getAgentById(senderAgentId)!;
    const recipient = this.store.getAgentById(recipientAgentId)!;

    // Update collaborator list and owner
    const newCollaborators = Array.from(new Set([...task.collaboratorAgentIds, senderAgentId]));
    const newVersion = task.contextVersion + 1;

    // Create a context entry for the handoff note
    const handoffEntry: ContextEntry = {
      id: generateId('ctx'),
      taskId,
      version: newVersion,
      kind: 'handoff_note',
      title: `Task Handoff: ${sender.displayName} → ${recipient.displayName}`,
      summary: handoffNote,
      structuredValue: {
        previousOwner: sender.displayName,
        newOwner: recipient.displayName,
        note: handoffNote,
        transferredAt: nowIso(),
      },
      sourceAgentId: senderAgentId,
      createdAt: nowIso(),
      tags: ['handoff', 'assignment'],
      visibilityScope: task.requiredScope,
    };
    this.store.saveContextEntry(handoffEntry);

    // Update task
    this.store.updateTask(taskId, {
      ownerAgentId: recipientAgentId,
      collaboratorAgentIds: newCollaborators,
      status: 'in_progress',
      contextVersion: newVersion,
      updatedAt: nowIso(),
    });

    // Update agent task counts
    this.store.updateAgent(senderAgentId, {
      currentTaskCount: Math.max(0, sender.currentTaskCount - 1),
      status: sender.currentTaskCount - 1 > 0 ? 'busy' : 'online',
    });
    this.store.updateAgent(recipientAgentId, {
      currentTaskCount: recipient.currentTaskCount + 1,
      status: 'busy',
    });

    this.validationService.logAuditEvent({
      eventType: 'TASK_HANDOFF',
      actorAgentId: senderAgentId,
      targetAgentId: recipientAgentId,
      taskId,
      accepted: true,
      reason: `Task '${task.title}' handed off from ${sender.displayName} to ${recipient.displayName}.`,
      payloadSummary: `Handoff: ${sender.displayName} → ${recipient.displayName}`,
      fullPayload: { taskId, senderAgentId, recipientAgentId, note: handoffNote },
    });

    return {
      accepted: true,
      reason: `Task successfully transferred to ${recipient.displayName}. Context bumped to v${newVersion}.`,
      warnings: [],
    };
  }
}
