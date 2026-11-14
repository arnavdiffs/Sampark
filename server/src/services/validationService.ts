import { Agent, Task, ContextEntry, PermissionScope, AgentAction, TaskStatus, ValidationResult } from '../domain/types';
import { SamparkStore } from '../persistence/store';
import { generateId, nowIso } from '../domain/ids';

export class ValidationService {
  constructor(private store: SamparkStore) {}

  /**
   * Validates that an agent exists, is not revoked, has a valid session, and is in an active status.
   */
  public validateAgentIdentity(agentId: string, requiredStatus?: ('online' | 'busy' | 'idle')[]): ValidationResult {
    const agent = this.store.getAgentById(agentId);
    if (!agent) {
      return {
        accepted: false,
        reason: `Agent identity not found: agent '${agentId}' does not exist in local mesh registry.`,
        warnings: [],
        recommendedNextAction: 'Register the agent with valid credentials before attempting operations.',
      };
    }

    if (agent.revoked) {
      return {
        accepted: false,
        reason: `Agent '${agent.displayName}' (${agent.id}) has been revoked. All actions are blocked.`,
        warnings: ['Security policy: Revoked credentials cannot participate in mesh operations.'],
        recommendedNextAction: 'Re-issue credentials or create a new session for this agent.',
      };
    }

    const expiryTime = new Date(agent.sessionExpiresAt).getTime();
    if (Date.now() > expiryTime) {
      return {
        accepted: false,
        reason: `Agent '${agent.displayName}' session '${agent.sessionId}' expired at ${agent.sessionExpiresAt}.`,
        warnings: ['Session expired. Local cryptographic lease has lapsed.'],
        recommendedNextAction: 'Call POST /api/agents/:id/renew-session to extend the lease.',
      };
    }

    if (agent.status === 'offline') {
      return {
        accepted: false,
        reason: `Agent '${agent.displayName}' is currently offline.`,
        warnings: ['Offline agents cannot execute or claim tasks.'],
        recommendedNextAction: 'Send a heartbeat or update agent status to online.',
      };
    }

    if (requiredStatus && !requiredStatus.includes(agent.status as any)) {
      return {
        accepted: false,
        reason: `Agent '${agent.displayName}' status '${agent.status}' is not in required statuses [${requiredStatus.join(', ')}].`,
        warnings: [],
        recommendedNextAction: `Switch agent status to ${requiredStatus.join(' or ')}.`,
      };
    }

    return {
      accepted: true,
      reason: `Agent '${agent.displayName}' authenticated with valid active session.`,
      warnings: [],
    };
  }

  /**
   * Validates that an agent has the required action in allowedActions and required scope in allowedScopes.
   */
  public validateAuthorization(
    agentId: string,
    action: AgentAction,
    targetScope?: PermissionScope
  ): ValidationResult {
    const identResult = this.validateAgentIdentity(agentId);
    if (!identResult.accepted) return identResult;

    const agent = this.store.getAgentById(agentId)!;

    if (!agent.allowedActions.includes(action)) {
      return {
        accepted: false,
        reason: `Agent '${agent.displayName}' is unauthorized for action '${action}'. Permitted actions: [${agent.allowedActions.join(', ')}].`,
        warnings: ['Action boundary violation.'],
        recommendedNextAction: 'Request role elevation through Coordinator review.',
      };
    }

    if (targetScope && !agent.allowedScopes.includes(targetScope)) {
      return {
        accepted: false,
        reason: `Rejected: ${agent.displayName} has [${agent.allowedScopes.join(', ')}] scope only and cannot perform '${action}' on '${targetScope}' scope.`,
        warnings: [`Cross-scope boundary restriction: target scope is '${targetScope}'.`],
        recommendedNextAction: `Hand off task to an agent permitted in '${targetScope}' scope.`,
      };
    }

    return {
      accepted: true,
      reason: `Agent '${agent.displayName}' is authorized for '${action}' on scope '${targetScope || 'any'}'.`,
      warnings: [],
    };
  }

  /**
   * Validates task state transition rules.
   */
  public validateTaskTransition(
    currentStatus: TaskStatus,
    targetStatus: TaskStatus,
    isReopen: boolean = false
  ): ValidationResult {
    if (currentStatus === targetStatus) {
      return {
        accepted: true,
        reason: `Task is already in status '${currentStatus}'.`,
        warnings: [],
      };
    }

    const validTransitions: Record<TaskStatus, TaskStatus[]> = {
      backlog: ['ready'],
      ready: ['in_progress', 'blocked', 'backlog'],
      in_progress: ['blocked', 'review', 'done', 'ready'],
      blocked: ['in_progress', 'ready'],
      review: ['in_progress', 'done', 'ready'],
      done: isReopen ? ['ready', 'in_progress'] : [],
    };

    const allowed = validTransitions[currentStatus] || [];
    if (!allowed.includes(targetStatus)) {
      if (currentStatus === 'done' && !isReopen) {
        return {
          accepted: false,
          reason: `Invalid transition: Task is already marked as 'done'. Completed tasks cannot transition to '${targetStatus}' without an explicit reopen flag.`,
          warnings: ['Audit safeguard: Completed tasks require explicit reopen confirmation.'],
          recommendedNextAction: 'Provide reopen=true flag to re-evaluate completed tasks.',
        };
      }

      return {
        accepted: false,
        reason: `Invalid transition: Task cannot transition from '${currentStatus}' to '${targetStatus}'. Allowed transitions: [${allowed.join(', ')}].`,
        warnings: [],
        recommendedNextAction: `Move task to one of: ${allowed.join(', ')}.`,
      };
    }

    return {
      accepted: true,
      reason: `Transition from '${currentStatus}' to '${targetStatus}' is valid.`,
      warnings: [],
    };
  }

  /**
   * Validates claiming a task.
   */
  public validateTaskClaim(agentId: string, taskId: string): ValidationResult {
    const identResult = this.validateAgentIdentity(agentId);
    if (!identResult.accepted) return identResult;

    const authResult = this.validateAuthorization(agentId, 'claim_task');
    if (!authResult.accepted) return authResult;

    const agent = this.store.getAgentById(agentId)!;
    const task = this.store.getTaskById(taskId);

    if (!task) {
      return {
        accepted: false,
        reason: `Task '${taskId}' not found.`,
        warnings: [],
      };
    }

    // Scope check
    if (!agent.allowedScopes.includes(task.requiredScope)) {
      return {
        accepted: false,
        reason: `Rejected: Agent '${agent.displayName}' (${agent.role}) has scopes [${agent.allowedScopes.join(', ')}] and cannot claim task '${task.title}' requiring '${task.requiredScope}' scope.`,
        warnings: ['Scope mismatch.'],
        recommendedNextAction: `Assign to an agent permitted in scope '${task.requiredScope}'.`,
      };
    }

    // Capacity check
    if (agent.currentTaskCount >= agent.maxConcurrentTasks) {
      return {
        accepted: false,
        reason: `Agent '${agent.displayName}' is at maximum concurrent task capacity (${agent.currentTaskCount}/${agent.maxConcurrentTasks}).`,
        warnings: ['Capacity bottleneck.'],
        recommendedNextAction: 'Wait for agent to complete in-flight tasks or assign to another agent.',
      };
    }

    // Capability check
    const missingCaps = task.requiredCapabilities.filter((c) => !agent.capabilities.includes(c));
    if (missingCaps.length > 0) {
      return {
        accepted: false,
        reason: `Rejected: Agent '${agent.displayName}' lacks required capabilities [${missingCaps.join(', ')}] for task '${task.title}'.`,
        warnings: [`Agent capabilities: [${agent.capabilities.join(', ')}]`],
        recommendedNextAction: `Route task to an agent equipped with: [${task.requiredCapabilities.join(', ')}].`,
      };
    }

    // Task status check
    if (task.status !== 'ready' && task.status !== 'backlog') {
      return {
        accepted: false,
        reason: `Task '${task.title}' is in status '${task.status}' and cannot be claimed directly. Only 'ready' or 'backlog' tasks can be claimed.`,
        warnings: [],
        recommendedNextAction: 'Check task status before claiming.',
      };
    }

    return {
      accepted: true,
      reason: `Agent '${agent.displayName}' successfully verified to claim task '${task.title}'.`,
      warnings: [],
    };
  }

  /**
   * Validates handing off a task from current owner to target recipient.
   */
  public validateHandoff(
    senderAgentId: string,
    recipientAgentId: string,
    taskId: string,
    handoffNote?: string
  ): ValidationResult {
    const senderIdent = this.validateAgentIdentity(senderAgentId);
    if (!senderIdent.accepted) return senderIdent;

    const senderAuth = this.validateAuthorization(senderAgentId, 'handoff_task');
    if (!senderAuth.accepted) return senderAuth;

    const recipientIdent = this.validateAgentIdentity(recipientAgentId);
    if (!recipientIdent.accepted) {
      return {
        accepted: false,
        reason: `Handoff rejected: Recipient agent check failed: ${recipientIdent.reason}`,
        warnings: recipientIdent.warnings,
        recommendedNextAction: 'Select an active, online agent for handoff.',
      };
    }

    const task = this.store.getTaskById(taskId);
    if (!task) {
      return {
        accepted: false,
        reason: `Task '${taskId}' not found.`,
        warnings: [],
      };
    }

    const recipient = this.store.getAgentById(recipientAgentId)!;

    // Recipient scope check
    if (!recipient.allowedScopes.includes(task.requiredScope)) {
      return {
        accepted: false,
        reason: `Handoff rejected: Recipient '${recipient.displayName}' lacks required scope '${task.requiredScope}' (allowed: [${recipient.allowedScopes.join(', ')}]).`,
        warnings: ['Scope mismatch on handoff.'],
        recommendedNextAction: `Hand off to an agent with scope '${task.requiredScope}'.`,
      };
    }

    // Recipient capacity check
    if (recipient.currentTaskCount >= recipient.maxConcurrentTasks) {
      return {
        accepted: false,
        reason: `Handoff rejected: Recipient '${recipient.displayName}' is at full capacity (${recipient.currentTaskCount}/${recipient.maxConcurrentTasks}).`,
        warnings: ['Recipient at maximum capacity.'],
        recommendedNextAction: 'Choose an agent with available capacity.',
      };
    }

    // Recipient capability check
    const missingCaps = task.requiredCapabilities.filter((c) => !recipient.capabilities.includes(c));
    if (missingCaps.length > 0) {
      return {
        accepted: false,
        reason: `Handoff rejected: Recipient '${recipient.displayName}' lacks required capabilities [${missingCaps.join(', ')}].`,
        warnings: [],
        recommendedNextAction: `Target agent must have capabilities [${task.requiredCapabilities.join(', ')}].`,
      };
    }

    if (!handoffNote || handoffNote.trim().length < 5) {
      return {
        accepted: false,
        reason: 'Handoff rejected: A structured handoff note (at least 5 characters) is required to ensure context continuity.',
        warnings: ['Handoff note missing or too brief.'],
        recommendedNextAction: 'Provide a concise summary note describing handoff state.',
      };
    }

    return {
      accepted: true,
      reason: `Handoff to '${recipient.displayName}' validated successfully.`,
      warnings: [],
    };
  }

  /**
   * Validates publishing a structured context entry.
   */
  public validateContextPublish(
    agentId: string,
    taskId: string,
    entry: {
      kind: string;
      title: string;
      summary: string;
      structuredValue: unknown;
      visibilityScope: PermissionScope;
    }
  ): ValidationResult {
    const identResult = this.validateAgentIdentity(agentId);
    if (!identResult.accepted) return identResult;

    const authResult = this.validateAuthorization(agentId, 'publish_context', entry.visibilityScope);
    if (!authResult.accepted) return authResult;

    const agent = this.store.getAgentById(agentId)!;
    const task = this.store.getTaskById(taskId);

    if (!task) {
      return {
        accepted: false,
        reason: `Context publish rejected: Task '${taskId}' does not exist.`,
        warnings: [],
      };
    }

    // Validate structuredValue
    if (
      !entry.structuredValue ||
      typeof entry.structuredValue !== 'object' ||
      Array.isArray(entry.structuredValue) ||
      Object.keys(entry.structuredValue).length === 0
    ) {
      return {
        accepted: false,
        reason: `Context publish rejected: structuredValue must be a non-empty JSON object containing typed key-value pairs.`,
        warnings: ['Malformed payload: raw strings or empty payloads are rejected.'],
        recommendedNextAction: 'Format context as a valid structured JSON object with key-value pairs.',
      };
    }

    // Title & Summary validation
    if (!entry.title || entry.title.trim().length < 3) {
      return {
        accepted: false,
        reason: 'Context publish rejected: title must be at least 3 characters long.',
        warnings: [],
      };
    }

    if (!entry.summary || entry.summary.trim().length < 5) {
      return {
        accepted: false,
        reason: 'Context publish rejected: summary must be at least 5 characters long.',
        warnings: [],
      };
    }

    // Visibility scope vs agent permitted scope
    if (!agent.allowedScopes.includes(entry.visibilityScope)) {
      return {
        accepted: false,
        reason: `Rejected: ${agent.displayName} has scope [${agent.allowedScopes.join(', ')}] only and cannot publish context with '${entry.visibilityScope}' visibility.`,
        warnings: ['Cross-scope context pollution prevented.'],
        recommendedNextAction: `Set visibility scope to one of [${agent.allowedScopes.join(', ')}].`,
      };
    }

    return {
      accepted: true,
      reason: `Context entry '${entry.title}' validated and approved for publishing.`,
      warnings: [],
    };
  }

  /**
   * Helper to log audit event when validation passes or fails.
   */
  public logAuditEvent(params: {
    eventType: any;
    actorAgentId: string;
    targetAgentId?: string;
    taskId?: string;
    accepted: boolean;
    reason: string;
    payloadSummary: string;
    fullPayload: Record<string, unknown>;
  }) {
    const event = {
      id: generateId('evt'),
      timestamp: nowIso(),
      eventType: params.eventType,
      actorAgentId: params.actorAgentId,
      targetAgentId: params.targetAgentId,
      taskId: params.taskId,
      accepted: params.accepted,
      reason: params.reason,
      payloadSummary: params.payloadSummary,
      fullPayload: params.fullPayload,
      correlationId: generateId('cor'),
    };
    return this.store.appendEvent(event);
  }
}
