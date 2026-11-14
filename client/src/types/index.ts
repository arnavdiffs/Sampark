export type AgentRole =
  | 'Coordinator'
  | 'Frontend Builder'
  | 'Backend Builder'
  | 'Test Runner'
  | 'Security Reviewer'
  | 'Researcher';

export type AgentProvider =
  | 'Antigravity'
  | 'Codex'
  | 'Claude Code'
  | 'ZCode'
  | 'Hermes'
  | 'Local Simulator';

export type AgentStatus = 'online' | 'busy' | 'idle' | 'offline';

export type AgentAction =
  | 'read_context'
  | 'publish_context'
  | 'claim_task'
  | 'handoff_task'
  | 'update_task'
  | 'run_tests'
  | 'review';

export type PermissionScope =
  | 'frontend'
  | 'backend'
  | 'testing'
  | 'security'
  | 'docs';

export interface Agent {
  id: string;
  sessionId: string;
  displayName: string;
  role: AgentRole;
  provider: AgentProvider;
  status: AgentStatus;
  capabilities: string[];
  powerScore: number;
  maxConcurrentTasks: number;
  currentTaskCount: number;
  allowedActions: AgentAction[];
  allowedScopes: PermissionScope[];
  createdAt: string;
  lastSeenAt: string;
  sessionExpiresAt: string;
  revoked: boolean;
}

export type TaskStatus =
  | 'backlog'
  | 'ready'
  | 'in_progress'
  | 'blocked'
  | 'review'
  | 'done';

export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  requiredCapabilities: string[];
  requiredScope: PermissionScope;
  ownerAgentId: string | null;
  collaboratorAgentIds: string[];
  repository: string;
  branch: string;
  fileScopes: string[];
  dependencyTaskIds: string[];
  contextVersion: number;
  createdAt: string;
  updatedAt: string;
  dueHint?: string;
  routingExplanation?: string;
  latestEvidenceSummary?: string;
}

export type ContextKind =
  | 'decision'
  | 'api_contract'
  | 'file_change'
  | 'test_result'
  | 'dependency'
  | 'handoff_note'
  | 'risk';

export interface ContextEntry {
  id: string;
  taskId: string;
  version: number;
  kind: ContextKind;
  title: string;
  structuredValue: Record<string, any>;
  summary: string;
  sourceAgentId: string;
  createdAt: string;
  tags: string[];
  visibilityScope: PermissionScope;
}

export type AuditEventType =
  | 'AGENT_REGISTERED'
  | 'AGENT_HEARTBEAT'
  | 'TASK_CREATED'
  | 'TASK_ASSIGNED'
  | 'TASK_CLAIMED'
  | 'TASK_HANDOFF'
  | 'TASK_STATUS_UPDATED'
  | 'CONTEXT_PUBLISHED'
  | 'CONTEXT_REQUESTED'
  | 'VALIDATION_REJECTED'
  | 'SESSION_EXPIRED'
  | 'AGENT_REVOKED'
  | 'TEST_EVIDENCE_PUBLISHED';

export interface AuditEvent {
  id: string;
  timestamp: string;
  eventType: AuditEventType;
  actorAgentId: string;
  targetAgentId?: string;
  taskId?: string;
  accepted: boolean;
  reason: string;
  payloadSummary: string;
  fullPayload: Record<string, any>;
  correlationId: string;
}

export interface ValidationResult {
  accepted: boolean;
  reason: string;
  warnings: string[];
  eventId?: string;
  recommendedNextAction?: string;
}

export interface CompactContextResponse {
  task: Task;
  currentVersion: number;
  deltaEntries: ContextEntry[];
  dependencySummary: { id: string; title: string; status: TaskStatus }[];
  latestEvidence: ContextEntry[];
  compactBrief: string;
  estimatedBytes: number;
}

export interface RoutingCandidateScore {
  agent: Agent;
  score: number;
  matchesCapability: boolean;
  matchesScope: boolean;
  hasCapacity: boolean;
  isOnlineOrIdle: boolean;
  breakdown: {
    capabilityScore: number;
    scopeScore: number;
    capacityScore: number;
    statusScore: number;
    powerScore: number;
  };
}

export interface RoutingRecommendation {
  taskId: string;
  recommendedAgent: Agent | null;
  explanation: string;
  rankedCandidates: RoutingCandidateScore[];
}

export interface HealthStatus {
  status: string;
  service: string;
  timestamp: string;
  version: string;
  mode: string;
  agentsCount: number;
  tasksCount: number;
  eventsCount: number;
}
