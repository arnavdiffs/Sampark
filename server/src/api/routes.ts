import { Router, Request, Response } from 'express';
import { SamparkStore } from '../persistence/store';
import { ValidationService } from '../services/validationService';
import { RoutingService } from '../services/routingService';
import { ContextService } from '../services/contextService';
import { Agent, Task, ContextEntry, TaskStatus, PermissionScope, AgentRole, AgentProvider } from '../domain/types';
import { generateId, nowIso, hoursFromNowIso } from '../domain/ids';
import { createInitialSeedData } from '../seed/seedData';

export function createRouter(
  store: SamparkStore,
  validationService: ValidationService,
  routingService: RoutingService,
  contextService: ContextService
): Router {
  const router = Router();

  // --- Health ---
  router.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'sampark-server',
      timestamp: nowIso(),
      version: '1.0.0',
      mode: 'local-prototype',
      agentsCount: store.getAgents().length,
      tasksCount: store.getTasks().length,
      eventsCount: store.getEvents().length,
    });
  });

  // --- Agents ---
  router.get('/agents', (_req: Request, res: Response) => {
    const agents = store.getAgents();
    res.json(agents);
  });

  router.get('/agents/:id', (req: Request, res: Response) => {
    const agent = store.getAgentById(req.params.id);
    if (!agent) {
      return res.status(404).json({ error: `Agent '${req.params.id}' not found` });
    }
    res.json(agent);
  });

  router.post('/agents', (req: Request, res: Response) => {
    const {
      displayName,
      role,
      provider,
      capabilities,
      powerScore,
      maxConcurrentTasks,
      allowedActions,
      allowedScopes,
    } = req.body;

    if (!displayName || typeof displayName !== 'string' || displayName.trim().length < 2) {
      return res.status(400).json({ error: 'Valid displayName (min 2 chars) is required' });
    }

    if (!role || !provider) {
      return res.status(400).json({ error: 'Valid role and provider are required' });
    }

    const newAgent: Agent = {
      id: generateId('agt'),
      sessionId: generateId('sess'),
      displayName: displayName.trim(),
      role: role as AgentRole,
      provider: provider as AgentProvider,
      status: 'online',
      capabilities: Array.isArray(capabilities) ? capabilities : ['typescript'],
      powerScore: Math.min(5, Math.max(1, Number(powerScore) || 3)),
      maxConcurrentTasks: Math.min(10, Math.max(1, Number(maxConcurrentTasks) || 2)),
      currentTaskCount: 0,
      allowedActions: Array.isArray(allowedActions) && allowedActions.length > 0
        ? allowedActions
        : ['read_context', 'publish_context', 'claim_task', 'update_task'],
      allowedScopes: Array.isArray(allowedScopes) && allowedScopes.length > 0
        ? allowedScopes
        : ['frontend'],
      createdAt: nowIso(),
      lastSeenAt: nowIso(),
      sessionExpiresAt: hoursFromNowIso(12),
      revoked: false,
    };

    store.saveAgent(newAgent);

    validationService.logAuditEvent({
      eventType: 'AGENT_REGISTERED',
      actorAgentId: newAgent.id,
      accepted: true,
      reason: `Agent '${newAgent.displayName}' (${newAgent.role}) successfully registered.`,
      payloadSummary: `New agent registered: ${newAgent.displayName}`,
      fullPayload: { agent: newAgent },
    });

    res.status(201).json(newAgent);
  });

  router.patch('/agents/:id', (req: Request, res: Response) => {
    const existing = store.getAgentById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: `Agent '${req.params.id}' not found` });
    }

    const allowedUpdates = ['displayName', 'status', 'capabilities', 'powerScore', 'maxConcurrentTasks', 'allowedActions', 'allowedScopes'];
    const updates: Partial<Agent> = {};
    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        (updates as any)[key] = req.body[key];
      }
    }
    updates.lastSeenAt = nowIso();

    const updated = store.updateAgent(req.params.id, updates);
    res.json(updated);
  });

  router.post('/agents/:id/heartbeat', (req: Request, res: Response) => {
    const agent = store.getAgentById(req.params.id);
    if (!agent) {
      return res.status(404).json({ error: `Agent '${req.params.id}' not found` });
    }

    if (agent.revoked) {
      validationService.logAuditEvent({
        eventType: 'VALIDATION_REJECTED',
        actorAgentId: agent.id,
        accepted: false,
        reason: `Heartbeat rejected for revoked agent ${agent.displayName}.`,
        payloadSummary: `Rejected heartbeat on revoked agent ${agent.displayName}`,
        fullPayload: { agentId: agent.id },
      });
      return res.status(403).json({ error: 'Cannot heartbeat a revoked agent' });
    }

    const updated = store.updateAgent(agent.id, {
      lastSeenAt: nowIso(),
      sessionExpiresAt: hoursFromNowIso(12),
      status: agent.status === 'offline' ? 'online' : agent.status,
    });

    validationService.logAuditEvent({
      eventType: 'AGENT_HEARTBEAT',
      actorAgentId: agent.id,
      accepted: true,
      reason: `Agent '${agent.displayName}' renewed active session via heartbeat.`,
      payloadSummary: `Heartbeat acknowledged: ${agent.displayName}`,
      fullPayload: { agentId: agent.id, newExpiresAt: updated?.sessionExpiresAt },
    });

    res.json({ success: true, agent: updated });
  });

  router.post('/agents/:id/revoke', (req: Request, res: Response) => {
    const agent = store.getAgentById(req.params.id);
    if (!agent) {
      return res.status(404).json({ error: `Agent '${req.params.id}' not found` });
    }

    const updated = store.updateAgent(agent.id, {
      revoked: true,
      status: 'offline',
    });

    validationService.logAuditEvent({
      eventType: 'AGENT_REVOKED',
      actorAgentId: agent.id,
      accepted: true,
      reason: `Security event: Agent '${agent.displayName}' session revoked by administrator.`,
      payloadSummary: `Agent credentials revoked: ${agent.displayName}`,
      fullPayload: { agentId: agent.id, revokedAt: nowIso() },
    });

    res.json({ success: true, agent: updated });
  });

  router.post('/agents/:id/renew-session', (req: Request, res: Response) => {
    const agent = store.getAgentById(req.params.id);
    if (!agent) {
      return res.status(404).json({ error: `Agent '${req.params.id}' not found` });
    }

    const newSessionId = generateId('sess');
    const updated = store.updateAgent(agent.id, {
      sessionId: newSessionId,
      sessionExpiresAt: hoursFromNowIso(24),
      revoked: false,
      status: 'online',
      lastSeenAt: nowIso(),
    });

    validationService.logAuditEvent({
      eventType: 'AGENT_HEARTBEAT',
      actorAgentId: agent.id,
      accepted: true,
      reason: `Session renewed: ${agent.displayName} issued new session lease '${newSessionId}'.`,
      payloadSummary: `Session renewed for ${agent.displayName}`,
      fullPayload: { agentId: agent.id, newSessionId },
    });

    res.json({ success: true, agent: updated });
  });

  // --- Tasks ---
  router.get('/tasks', (req: Request, res: Response) => {
    const { status, ownerAgentId, priority, requiredScope } = req.query;
    const tasks = store.getTasks({
      status: status as string | undefined,
      ownerAgentId: ownerAgentId as string | undefined,
      priority: priority as string | undefined,
      requiredScope: requiredScope as string | undefined,
    });
    res.json(tasks);
  });

  router.get('/tasks/:id', (req: Request, res: Response) => {
    const task = store.getTaskById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: `Task '${req.params.id}' not found` });
    }
    res.json(task);
  });

  router.post('/tasks', (req: Request, res: Response) => {
    const {
      title,
      description,
      priority,
      requiredCapabilities,
      requiredScope,
      repository,
      branch,
      fileScopes,
      dependencyTaskIds,
      ownerAgentId,
      actorAgentId,
    } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      return res.status(400).json({ error: 'Valid title (min 3 chars) is required' });
    }

    if (!requiredScope) {
      return res.status(400).json({ error: 'requiredScope is required' });
    }

    const actor = actorAgentId ? store.getAgentById(actorAgentId) : null;
    const effectiveActorId = actor ? actor.id : 'agt_coordinator';

    const newTask: Task = {
      id: generateId('tsk'),
      title: title.trim(),
      description: description || '',
      status: ownerAgentId ? 'in_progress' : 'ready',
      priority: priority || 'medium',
      requiredCapabilities: Array.isArray(requiredCapabilities) ? requiredCapabilities : [],
      requiredScope: requiredScope as PermissionScope,
      ownerAgentId: ownerAgentId || null,
      collaboratorAgentIds: ownerAgentId ? [ownerAgentId] : [],
      repository: repository || 'sampark-mesh/main-repo',
      branch: branch || 'main',
      fileScopes: Array.isArray(fileScopes) ? fileScopes : [],
      dependencyTaskIds: Array.isArray(dependencyTaskIds) ? dependencyTaskIds : [],
      contextVersion: 1,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    store.saveTask(newTask);

    if (ownerAgentId) {
      const owner = store.getAgentById(ownerAgentId);
      if (owner) {
        store.updateAgent(ownerAgentId, {
          currentTaskCount: owner.currentTaskCount + 1,
          status: 'busy',
        });
      }
    }

    validationService.logAuditEvent({
      eventType: 'TASK_CREATED',
      actorAgentId: effectiveActorId,
      taskId: newTask.id,
      accepted: true,
      reason: `Task '${newTask.title}' initialized in scope '${newTask.requiredScope}'.`,
      payloadSummary: `Created task: ${newTask.title}`,
      fullPayload: { task: newTask },
    });

    res.status(201).json(newTask);
  });

  router.patch('/tasks/:id', (req: Request, res: Response) => {
    const task = store.getTaskById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: `Task '${req.params.id}' not found` });
    }

    const allowed = ['title', 'description', 'priority', 'repository', 'branch', 'fileScopes', 'dueHint'];
    const updates: Partial<Task> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        (updates as any)[key] = req.body[key];
      }
    }
    updates.updatedAt = nowIso();

    const updated = store.updateTask(task.id, updates);
    res.json(updated);
  });

  router.post('/tasks/:id/claim', (req: Request, res: Response) => {
    const { agentId } = req.body;
    const taskId = req.params.id;

    if (!agentId) {
      return res.status(400).json({ error: 'agentId is required to claim task' });
    }

    const validation = validationService.validateTaskClaim(agentId, taskId);
    if (!validation.accepted) {
      validationService.logAuditEvent({
        eventType: 'VALIDATION_REJECTED',
        actorAgentId: agentId,
        taskId,
        accepted: false,
        reason: validation.reason,
        payloadSummary: `Task claim blocked for agent ${agentId}`,
        fullPayload: { agentId, taskId, warnings: validation.warnings },
      });
      return res.status(403).json(validation);
    }

    const task = store.getTaskById(taskId)!;
    const agent = store.getAgentById(agentId)!;

    const updatedTask = store.updateTask(taskId, {
      ownerAgentId: agentId,
      status: 'in_progress',
      collaboratorAgentIds: Array.from(new Set([...task.collaboratorAgentIds, agentId])),
      updatedAt: nowIso(),
    });

    store.updateAgent(agentId, {
      currentTaskCount: agent.currentTaskCount + 1,
      status: 'busy',
    });

    validationService.logAuditEvent({
      eventType: 'TASK_CLAIMED',
      actorAgentId: agentId,
      taskId,
      accepted: true,
      reason: validation.reason,
      payloadSummary: `${agent.displayName} claimed task '${task.title}'`,
      fullPayload: { agentId, taskId },
    });

    res.json({ success: true, task: updatedTask, validation });
  });

  router.post('/tasks/:id/assign', (req: Request, res: Response) => {
    const { targetAgentId, coordinatorAgentId } = req.body;
    const taskId = req.params.id;

    if (!targetAgentId) {
      return res.status(400).json({ error: 'targetAgentId is required' });
    }

    const validation = validationService.validateTaskClaim(targetAgentId, taskId);
    if (!validation.accepted) {
      validationService.logAuditEvent({
        eventType: 'VALIDATION_REJECTED',
        actorAgentId: coordinatorAgentId || 'agt_coordinator',
        targetAgentId,
        taskId,
        accepted: false,
        reason: `Assignment rejected: ${validation.reason}`,
        payloadSummary: `Assignment rejected for task ${taskId}`,
        fullPayload: { targetAgentId, taskId, warnings: validation.warnings },
      });
      return res.status(403).json(validation);
    }

    const task = store.getTaskById(taskId)!;
    const targetAgent = store.getAgentById(targetAgentId)!;

    // Release old owner if any
    if (task.ownerAgentId && task.ownerAgentId !== targetAgentId) {
      const oldOwner = store.getAgentById(task.ownerAgentId);
      if (oldOwner) {
        store.updateAgent(oldOwner.id, {
          currentTaskCount: Math.max(0, oldOwner.currentTaskCount - 1),
          status: oldOwner.currentTaskCount - 1 > 0 ? 'busy' : 'online',
        });
      }
    }

    const updatedTask = store.updateTask(taskId, {
      ownerAgentId: targetAgentId,
      status: task.status === 'backlog' ? 'ready' : task.status,
      collaboratorAgentIds: Array.from(new Set([...task.collaboratorAgentIds, targetAgentId])),
      updatedAt: nowIso(),
    });

    store.updateAgent(targetAgentId, {
      currentTaskCount: targetAgent.currentTaskCount + 1,
      status: 'busy',
    });

    validationService.logAuditEvent({
      eventType: 'TASK_ASSIGNED',
      actorAgentId: coordinatorAgentId || 'agt_coordinator',
      targetAgentId,
      taskId,
      accepted: true,
      reason: `Task '${task.title}' assigned to ${targetAgent.displayName}.`,
      payloadSummary: `Task assigned to ${targetAgent.displayName}`,
      fullPayload: { taskId, targetAgentId },
    });

    res.json({ success: true, task: updatedTask, validation });
  });

  router.post('/tasks/:id/handoff', (req: Request, res: Response) => {
    const { senderAgentId, recipientAgentId, handoffNote } = req.body;
    const taskId = req.params.id;

    if (!senderAgentId || !recipientAgentId) {
      return res.status(400).json({ error: 'senderAgentId and recipientAgentId are required' });
    }

    const validation = validationService.validateHandoff(senderAgentId, recipientAgentId, taskId, handoffNote);
    if (!validation.accepted) {
      validationService.logAuditEvent({
        eventType: 'VALIDATION_REJECTED',
        actorAgentId: senderAgentId,
        targetAgentId: recipientAgentId,
        taskId,
        accepted: false,
        reason: validation.reason,
        payloadSummary: `Handoff rejected on task ${taskId}`,
        fullPayload: { senderAgentId, recipientAgentId, taskId, handoffNote },
      });
      return res.status(403).json(validation);
    }

    const task = store.getTaskById(taskId)!;
    const sender = store.getAgentById(senderAgentId)!;
    const recipient = store.getAgentById(recipientAgentId)!;
    const newVersion = task.contextVersion + 1;

    // Publish handoff context entry
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
      tags: ['handoff', 'transfer'],
      visibilityScope: task.requiredScope,
    };
    store.saveContextEntry(handoffEntry);

    const updatedTask = store.updateTask(taskId, {
      ownerAgentId: recipientAgentId,
      status: 'in_progress',
      collaboratorAgentIds: Array.from(new Set([...task.collaboratorAgentIds, senderAgentId, recipientAgentId])),
      contextVersion: newVersion,
      updatedAt: nowIso(),
    });

    store.updateAgent(senderAgentId, {
      currentTaskCount: Math.max(0, sender.currentTaskCount - 1),
      status: sender.currentTaskCount - 1 > 0 ? 'busy' : 'online',
    });

    store.updateAgent(recipientAgentId, {
      currentTaskCount: recipient.currentTaskCount + 1,
      status: 'busy',
    });

    validationService.logAuditEvent({
      eventType: 'TASK_HANDOFF',
      actorAgentId: senderAgentId,
      targetAgentId: recipientAgentId,
      taskId,
      accepted: true,
      reason: `Task handoff completed: ${sender.displayName} transferred task to ${recipient.displayName}.`,
      payloadSummary: `Handoff: ${sender.displayName} → ${recipient.displayName}`,
      fullPayload: { taskId, senderAgentId, recipientAgentId, handoffNote, newVersion },
    });

    res.json({ success: true, task: updatedTask, validation });
  });

  router.post('/tasks/:id/status', (req: Request, res: Response) => {
    const { targetStatus, actorAgentId, isReopen } = req.body;
    const taskId = req.params.id;

    if (!targetStatus) {
      return res.status(400).json({ error: 'targetStatus is required' });
    }

    const task = store.getTaskById(taskId);
    if (!task) {
      return res.status(404).json({ error: `Task '${taskId}' not found` });
    }

    const validation = validationService.validateTaskTransition(task.status, targetStatus as TaskStatus, Boolean(isReopen));
    if (!validation.accepted) {
      validationService.logAuditEvent({
        eventType: 'VALIDATION_REJECTED',
        actorAgentId: actorAgentId || task.ownerAgentId || 'agt_system',
        taskId,
        accepted: false,
        reason: validation.reason,
        payloadSummary: `Status transition rejected: ${task.status} → ${targetStatus}`,
        fullPayload: { taskId, currentStatus: task.status, targetStatus, warnings: validation.warnings },
      });
      return res.status(403).json(validation);
    }

    const wasDone = task.status === 'done';
    const isNowDone = targetStatus === 'done';

    const updatedTask = store.updateTask(taskId, {
      status: targetStatus as TaskStatus,
      updatedAt: nowIso(),
    });

    // Adjust owner task counts if completing or reopening
    if (task.ownerAgentId) {
      const owner = store.getAgentById(task.ownerAgentId);
      if (owner) {
        if (!wasDone && isNowDone) {
          store.updateAgent(owner.id, {
            currentTaskCount: Math.max(0, owner.currentTaskCount - 1),
            status: owner.currentTaskCount - 1 > 0 ? 'busy' : 'idle',
          });
        } else if (wasDone && !isNowDone) {
          store.updateAgent(owner.id, {
            currentTaskCount: owner.currentTaskCount + 1,
            status: 'busy',
          });
        }
      }
    }

    validationService.logAuditEvent({
      eventType: 'TASK_STATUS_UPDATED',
      actorAgentId: actorAgentId || task.ownerAgentId || 'agt_system',
      taskId,
      accepted: true,
      reason: `Task status updated from '${task.status}' to '${targetStatus}'.`,
      payloadSummary: `Status: ${task.title} → ${targetStatus}`,
      fullPayload: { taskId, previousStatus: task.status, newStatus: targetStatus },
    });

    res.json({ success: true, task: updatedTask, validation });
  });

  router.get('/tasks/:id/routing-recommendation', (req: Request, res: Response) => {
    const recommendation = routingService.getRecommendationForTask(req.params.id);
    res.json(recommendation);
  });

  // --- Context ---
  router.get('/tasks/:id/context', (req: Request, res: Response) => {
    const taskId = req.params.id;
    const sinceVersion = req.query.sinceVersion !== undefined ? Number(req.query.sinceVersion) : undefined;

    const compact = contextService.getCompactContext(taskId, sinceVersion);
    if (!compact) {
      return res.status(404).json({ error: `Task '${taskId}' not found` });
    }

    validationService.logAuditEvent({
      eventType: 'CONTEXT_REQUESTED',
      actorAgentId: (req.query.requestingAgentId as string) || 'agt_client',
      taskId,
      accepted: true,
      reason: `Delta context requested for task '${taskId}' (sinceVersion: ${sinceVersion ?? 'all'}).`,
      payloadSummary: `Context delta requested (${compact.deltaEntries.length} entries, ${compact.estimatedBytes} bytes)`,
      fullPayload: { taskId, sinceVersion, currentVersion: compact.currentVersion },
    });

    res.json(compact);
  });

  router.post('/tasks/:id/context', (req: Request, res: Response) => {
    const taskId = req.params.id;
    const { kind, title, summary, structuredValue, sourceAgentId, visibilityScope, tags } = req.body;

    if (!sourceAgentId) {
      return res.status(400).json({ error: 'sourceAgentId is required' });
    }

    const validation = validationService.validateContextPublish(sourceAgentId, taskId, {
      kind,
      title,
      summary,
      structuredValue,
      visibilityScope: visibilityScope as PermissionScope,
    });

    if (!validation.accepted) {
      validationService.logAuditEvent({
        eventType: 'VALIDATION_REJECTED',
        actorAgentId: sourceAgentId,
        taskId,
        accepted: false,
        reason: validation.reason,
        payloadSummary: `Context publish blocked: '${title}'`,
        fullPayload: { taskId, title, kind, visibilityScope, warnings: validation.warnings },
      });
      return res.status(403).json(validation);
    }

    const task = store.getTaskById(taskId)!;
    const newVersion = task.contextVersion + 1;

    const newEntry: ContextEntry = {
      id: generateId('ctx'),
      taskId,
      version: newVersion,
      kind,
      title: title.trim(),
      summary: summary.trim(),
      structuredValue,
      sourceAgentId,
      createdAt: nowIso(),
      tags: Array.isArray(tags) ? tags : [],
      visibilityScope: visibilityScope as PermissionScope,
    };

    store.saveContextEntry(newEntry);

    const isTestEvidence = kind === 'test_result';
    let latestEvidenceSummary = task.latestEvidenceSummary;
    if (isTestEvidence) {
      latestEvidenceSummary = `${title}: ${summary}`;
    }

    const updatedTask = store.updateTask(taskId, {
      contextVersion: newVersion,
      latestEvidenceSummary,
      updatedAt: nowIso(),
    });

    validationService.logAuditEvent({
      eventType: isTestEvidence ? 'TEST_EVIDENCE_PUBLISHED' : 'CONTEXT_PUBLISHED',
      actorAgentId: sourceAgentId,
      taskId,
      accepted: true,
      reason: `Context entry '${newEntry.title}' successfully verified and committed as v${newVersion}.`,
      payloadSummary: `Context v${newVersion} committed: ${newEntry.title}`,
      fullPayload: { contextEntryId: newEntry.id, kind, newVersion },
    });

    res.status(201).json({
      success: true,
      contextEntry: newEntry,
      task: updatedTask,
      validation,
    });
  });

  // --- Audit Events ---
  router.get('/events', (req: Request, res: Response) => {
    const { eventType, taskId, agentId, accepted, limit } = req.query;
    const events = store.getEvents({
      eventType: eventType as string | undefined,
      taskId: taskId as string | undefined,
      agentId: agentId as string | undefined,
      accepted: accepted !== undefined ? accepted === 'true' : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.json(events);
  });

  router.get('/events/:id', (req: Request, res: Response) => {
    const event = store.getEventById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: `Event '${req.params.id}' not found` });
    }
    res.json(event);
  });

  // --- Demo Simulation & Reset ---
  let simulationStepCounter = 0;

  router.post('/demo/simulate-step', (_req: Request, res: Response) => {
    simulationStepCounter += 1;
    const stepMod = simulationStepCounter % 5;

    let simulationResult: Record<string, unknown> = {};

    switch (stepMod) {
      case 1: {
        // Step 1: Forge publishes updated API Contract v3
        const taskContract = store.getTaskById('tsk_login01');
        const forge = store.getAgentById('agt_forge03');
        if (taskContract && forge) {
          const newVer = taskContract.contextVersion + 1;
          const entry: ContextEntry = {
            id: generateId('ctx'),
            taskId: taskContract.id,
            version: newVer,
            kind: 'api_contract',
            title: `Auth Contract v${newVer} (Rate Limiting Spec)`,
            structuredValue: {
              endpoint: '/api/login',
              rateLimits: { windowMs: 60000, maxRequests: 5, headers: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'] },
              verifiedBy: forge.displayName,
            },
            summary: `Forge committed rate limiting headers to login API contract (v${newVer}).`,
            sourceAgentId: forge.id,
            createdAt: nowIso(),
            tags: ['contract', 'rate-limit', 'auth'],
            visibilityScope: 'backend',
          };
          store.saveContextEntry(entry);
          store.updateTask(taskContract.id, { contextVersion: newVer, updatedAt: nowIso() });
          validationService.logAuditEvent({
            eventType: 'CONTEXT_PUBLISHED',
            actorAgentId: forge.id,
            taskId: taskContract.id,
            accepted: true,
            reason: `Forge published API Contract v${newVer} with rate-limiting specification.`,
            payloadSummary: `Forge published API Contract v${newVer}`,
            fullPayload: { entry },
          });
          simulationResult = { step: 1, action: 'API Contract published by Forge', newVersion: newVer, taskId: taskContract.id };
        }
        break;
      }
      case 2: {
        // Step 2: Auto-route and assign "Run login browser tests" to Pulse
        const testTask = store.getTaskById('tsk_login03');
        const pulse = store.getAgentById('agt_pulse04');
        if (testTask && pulse) {
          store.updateTask(testTask.id, {
            ownerAgentId: pulse.id,
            status: 'in_progress',
            collaboratorAgentIds: Array.from(new Set([...testTask.collaboratorAgentIds, pulse.id])),
            updatedAt: nowIso(),
          });
          store.updateAgent(pulse.id, {
            currentTaskCount: pulse.currentTaskCount + 1,
            status: 'busy',
          });
          validationService.logAuditEvent({
            eventType: 'TASK_ASSIGNED',
            actorAgentId: 'agt_atlas01',
            targetAgentId: pulse.id,
            taskId: testTask.id,
            accepted: true,
            reason: `Coordinator auto-routed test task to Pulse based on matching browser-tests capability and 0 existing workload.`,
            payloadSummary: `Test task assigned to Pulse`,
            fullPayload: { taskId: testTask.id, agent: pulse.displayName },
          });
          simulationResult = { step: 2, action: 'Auto-routed and assigned task to Pulse', taskId: testTask.id, agent: pulse.displayName };
        }
        break;
      }
      case 3: {
        // Step 3: Pulse publishes comprehensive test evidence
        const testTask = store.getTaskById('tsk_login03');
        const pulse = store.getAgentById('agt_pulse04');
        if (testTask && pulse) {
          const newVer = testTask.contextVersion + 1;
          const entry: ContextEntry = {
            id: generateId('ctx'),
            taskId: testTask.id,
            version: newVer,
            kind: 'test_result',
            title: 'End-to-End Headless Browser Regression Run',
            structuredValue: {
              suite: 'e2e-auth-matrix',
              assertionsPassed: 24,
              assertionsFailed: 0,
              coveragePercent: 96.4,
              executionSeconds: 3.12,
              evidenceArtifact: 'artifacts/e2e/login-report-matrix.xml',
            },
            summary: 'Pulse executed headless regression suite: 24/24 assertions passed across Chrome and Firefox.',
            sourceAgentId: pulse.id,
            createdAt: nowIso(),
            tags: ['test_result', 'regression', 'e2e'],
            visibilityScope: 'testing',
          };
          store.saveContextEntry(entry);
          store.updateTask(testTask.id, {
            contextVersion: newVer,
            status: 'review',
            latestEvidenceSummary: '24/24 e2e browser assertions passed across Chromium and WebKit.',
            updatedAt: nowIso(),
          });
          validationService.logAuditEvent({
            eventType: 'TEST_EVIDENCE_PUBLISHED',
            actorAgentId: pulse.id,
            taskId: testTask.id,
            accepted: true,
            reason: `Pulse published comprehensive test results: 24 passing browser assertions.`,
            payloadSummary: `Pulse published test evidence for ${testTask.title}`,
            fullPayload: { entry },
          });
          simulationResult = { step: 3, action: 'Test evidence published by Pulse', taskId: testTask.id, assertionsPassed: 24 };
        }
        break;
      }
      case 4: {
        // Step 4: Unauthorized action attempted & REJECTED
        const nova = store.getAgentById('agt_nova02');
        const securityTask = store.getTaskById('tsk_login04');
        const novaName = nova ? nova.displayName : 'Nova';
        const securityTaskId = securityTask ? securityTask.id : 'tsk_login04';

        validationService.logAuditEvent({
          eventType: 'VALIDATION_REJECTED',
          actorAgentId: nova?.id || 'agt_nova02',
          taskId: securityTaskId,
          accepted: false,
          reason: `Rejected: ${novaName} has [frontend] scope only and cannot claim or modify '${securityTaskId}' requiring 'security' scope.`,
          payloadSummary: `${novaName} attempted unauthorized cross-scope claim (BLOCKED)`,
          fullPayload: {
            actor: novaName,
            attemptedAction: 'claim_task',
            attemptedScope: 'security',
            agentPermittedScopes: ['frontend'],
            violationType: 'CROSS_SCOPE_UNAUTHORIZED',
          },
        });

        simulationResult = {
          step: 4,
          action: 'Cross-scope unauthorized attempt BLOCKED and audited',
          actor: novaName,
          reason: `${novaName} has frontend scope only and cannot modify security boundary tasks.`,
        };
        break;
      }
      case 0: {
        // Step 5: Atlas verifies context package and completes task
        const packageTask = store.getTaskById('tsk_login05');
        const atlas = store.getAgentById('agt_atlas01');
        if (packageTask && atlas) {
          const newVer = packageTask.contextVersion + 1;
          const entry: ContextEntry = {
            id: generateId('ctx'),
            taskId: packageTask.id,
            version: newVer,
            kind: 'decision',
            title: 'Login Flow Mesh Sign-off',
            structuredValue: {
              decision: 'APPROVED_FOR_RELEASE',
              contractStatus: 'FROZEN',
              testCoverage: '100% Passing',
              securityBoundaries: 'VERIFIED',
              approvedBy: atlas.displayName,
            },
            summary: 'Atlas signed off on full login flow context package after verifying test evidence and contract integrity.',
            sourceAgentId: atlas.id,
            createdAt: nowIso(),
            tags: ['decision', 'signoff', 'milestone'],
            visibilityScope: 'docs',
          };
          store.saveContextEntry(entry);
          store.updateTask(packageTask.id, {
            status: 'done',
            contextVersion: newVer,
            latestEvidenceSummary: 'Atlas signed off: All login flow contracts, UI, and test suites verified.',
            updatedAt: nowIso(),
          });
          validationService.logAuditEvent({
            eventType: 'TASK_STATUS_UPDATED',
            actorAgentId: atlas.id,
            taskId: packageTask.id,
            accepted: true,
            reason: `Coordinator Atlas signed off on login flow package; marked task as done.`,
            payloadSummary: `Task marked done: Prepare shared context package`,
            fullPayload: { taskId: packageTask.id, status: 'done' },
          });
          simulationResult = { step: 5, action: 'Coordinator sign-off completed', taskId: packageTask.id, status: 'done' };
        }
        break;
      }
    }

    res.json({
      success: true,
      step: simulationStepCounter,
      simulationResult,
    });
  });

  router.post('/demo/reset', (_req: Request, res: Response) => {
    const seed = createInitialSeedData();
    store.resetWithData(
      {
        agents: seed.agents,
        tasks: seed.tasks,
        contextEntries: seed.contextEntries,
      },
      seed.events
    );
    simulationStepCounter = 0;

    validationService.logAuditEvent({
      eventType: 'TASK_CREATED',
      actorAgentId: 'agt_coordinator',
      accepted: true,
      reason: 'Demo environment reset to baseline seed state.',
      payloadSummary: 'Demo reset completed',
      fullPayload: { resetTimestamp: nowIso() },
    });

    res.json({
      success: true,
      message: 'Demo state successfully reset to initial seed data.',
      agents: store.getAgents().length,
      tasks: store.getTasks().length,
      contextEntries: store.getContextEntries().length,
      events: store.getEvents().length,
    });
  });

  return router;
}
