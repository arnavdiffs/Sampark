import {
  Agent,
  Task,
  ContextEntry,
  AuditEvent,
  ValidationResult,
  CompactContextResponse,
  RoutingRecommendation,
  HealthStatus,
} from '../types';

const BASE_URL = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorMsg = data.reason || data.error || `HTTP error ${res.status}`;
    const err = new Error(errorMsg);
    (err as any).data = data;
    (err as any).status = res.status;
    throw err;
  }
  return data as T;
}

export const api = {
  // Health
  getHealth: () => fetchJson<HealthStatus>(`${BASE_URL}/health`),

  // Agents
  getAgents: () => fetchJson<Agent[]>(`${BASE_URL}/agents`),
  getAgent: (id: string) => fetchJson<Agent>(`${BASE_URL}/agents/${id}`),
  createAgent: (data: Partial<Agent>) =>
    fetchJson<Agent>(`${BASE_URL}/agents`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateAgent: (id: string, data: Partial<Agent>) =>
    fetchJson<Agent>(`${BASE_URL}/agents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  heartbeatAgent: (id: string) =>
    fetchJson<{ success: boolean; agent: Agent }>(`${BASE_URL}/agents/${id}/heartbeat`, {
      method: 'POST',
    }),
  revokeAgent: (id: string) =>
    fetchJson<{ success: boolean; agent: Agent }>(`${BASE_URL}/agents/${id}/revoke`, {
      method: 'POST',
    }),
  renewAgentSession: (id: string) =>
    fetchJson<{ success: boolean; agent: Agent }>(`${BASE_URL}/agents/${id}/renew-session`, {
      method: 'POST',
    }),

  // Tasks
  getTasks: (filter?: { status?: string; ownerAgentId?: string; priority?: string; requiredScope?: string }) => {
    const params = new URLSearchParams();
    if (filter?.status) params.set('status', filter.status);
    if (filter?.ownerAgentId) params.set('ownerAgentId', filter.ownerAgentId);
    if (filter?.priority) params.set('priority', filter.priority);
    if (filter?.requiredScope) params.set('requiredScope', filter.requiredScope);
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchJson<Task[]>(`${BASE_URL}/tasks${query}`);
  },
  getTask: (id: string) => fetchJson<Task>(`${BASE_URL}/tasks/${id}`),
  createTask: (data: Partial<Task> & { actorAgentId?: string }) =>
    fetchJson<Task>(`${BASE_URL}/tasks`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateTask: (id: string, data: Partial<Task>) =>
    fetchJson<Task>(`${BASE_URL}/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  claimTask: (taskId: string, agentId: string) =>
    fetchJson<{ success: boolean; task: Task; validation: ValidationResult }>(
      `${BASE_URL}/tasks/${taskId}/claim`,
      {
        method: 'POST',
        body: JSON.stringify({ agentId }),
      }
    ),
  assignTask: (taskId: string, targetAgentId: string, coordinatorAgentId?: string) =>
    fetchJson<{ success: boolean; task: Task; validation: ValidationResult }>(
      `${BASE_URL}/tasks/${taskId}/assign`,
      {
        method: 'POST',
        body: JSON.stringify({ targetAgentId, coordinatorAgentId }),
      }
    ),
  handoffTask: (taskId: string, senderAgentId: string, recipientAgentId: string, handoffNote: string) =>
    fetchJson<{ success: boolean; task: Task; validation: ValidationResult }>(
      `${BASE_URL}/tasks/${taskId}/handoff`,
      {
        method: 'POST',
        body: JSON.stringify({ senderAgentId, recipientAgentId, handoffNote }),
      }
    ),
  updateTaskStatus: (taskId: string, targetStatus: string, actorAgentId?: string, isReopen?: boolean) =>
    fetchJson<{ success: boolean; task: Task; validation: ValidationResult }>(
      `${BASE_URL}/tasks/${taskId}/status`,
      {
        method: 'POST',
        body: JSON.stringify({ targetStatus, actorAgentId, isReopen }),
      }
    ),
  getRoutingRecommendation: (taskId: string) =>
    fetchJson<RoutingRecommendation>(`${BASE_URL}/tasks/${taskId}/routing-recommendation`),

  // Context
  getTaskContext: (taskId: string, sinceVersion?: number) => {
    const q = sinceVersion !== undefined ? `?sinceVersion=${sinceVersion}` : '';
    return fetchJson<CompactContextResponse>(`${BASE_URL}/tasks/${taskId}/context${q}`);
  },
  publishContext: (
    taskId: string,
    entry: {
      kind: string;
      title: string;
      summary: string;
      structuredValue: Record<string, any>;
      sourceAgentId: string;
      visibilityScope: string;
      tags?: string[];
    }
  ) =>
    fetchJson<{ success: boolean; contextEntry: ContextEntry; task: Task; validation: ValidationResult }>(
      `${BASE_URL}/tasks/${taskId}/context`,
      {
        method: 'POST',
        body: JSON.stringify(entry),
      }
    ),

  // Events / Audit
  getEvents: (filter?: { eventType?: string; taskId?: string; agentId?: string; accepted?: boolean; limit?: number }) => {
    const params = new URLSearchParams();
    if (filter?.eventType) params.set('eventType', filter.eventType);
    if (filter?.taskId) params.set('taskId', filter.taskId);
    if (filter?.agentId) params.set('agentId', filter.agentId);
    if (filter?.accepted !== undefined) params.set('accepted', String(filter.accepted));
    if (filter?.limit) params.set('limit', String(filter.limit));
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchJson<AuditEvent[]>(`${BASE_URL}/events${query}`);
  },
  getEvent: (id: string) => fetchJson<AuditEvent>(`${BASE_URL}/events/${id}`),

  // Demo
  simulateStep: () =>
    fetchJson<{ success: boolean; step: number; simulationResult: any }>(`${BASE_URL}/demo/simulate-step`, {
      method: 'POST',
    }),
  resetDemo: () =>
    fetchJson<{ success: boolean; message: string; agents: number; tasks: number; events: number }>(
      `${BASE_URL}/demo/reset`,
      {
        method: 'POST',
      }
    ),
};
