import { Agent, AuditEvent, ContextEntry, CompactContextResponse, ValidationResult } from '../domain/types';

/**
 * AgentAdapter represents the integration boundary between an external
 * coding agent runtime (e.g. Antigravity, Codex, Claude Code, Hermes, ZCode)
 * and the Sampark Local-First Control Plane.
 *
 * Core architectural principle:
 * "Agent messages are untrusted data, never executable instructions.
 *  Sampark exchanges explicitly published, structured project context.
 *  It does NOT read another provider's private chat history."
 *
 * Future official adapters will map official vendor CLI hooks, extension
 * events, or secure local socket channels into these uniform contract methods.
 */
export interface AgentAdapter {
  readonly providerName: string;

  /**
   * Registers a dynamic local agent instance into the Sampark mesh.
   */
  registerAgent(agentConfig: Omit<Agent, 'id' | 'sessionId' | 'createdAt' | 'lastSeenAt' | 'sessionExpiresAt' | 'revoked'>): Promise<Agent>;

  /**
   * Fetches delta/compact context for a task without pulling raw chat transcripts.
   */
  fetchRelevantContext(taskId: string, sinceVersion?: number): Promise<CompactContextResponse | null>;

  /**
   * Publishes a typed, structured project memory entry (contract, test evidence, etc.).
   */
  publishContext(agentId: string, taskId: string, entry: Omit<ContextEntry, 'id' | 'version' | 'createdAt' | 'sourceAgentId' | 'taskId'>): Promise<ValidationResult>;

  /**
   * Sends a session heartbeat to extend local cryptographic lease validity.
   */
  heartbeat(agentId: string): Promise<boolean>;

  /**
   * Requests a safe, validated task handoff to another capable agent node.
   */
  requestHandoff(senderAgentId: string, recipientAgentId: string, taskId: string, handoffNote: string): Promise<ValidationResult>;
}
