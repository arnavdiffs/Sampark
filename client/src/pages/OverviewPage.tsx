import React from 'react';
import { Agent, Task, AuditEvent, ContextEntry } from '../types';
import { MeshGraph } from '../components/MeshGraph';
import {
  Users,
  CheckCircle2,
  AlertOctagon,
  FileCode2,
  ListTodo,
  ShieldCheck,
  ArrowRight,
  Clock,
  Sparkles,
} from 'lucide-react';

interface OverviewPageProps {
  agents: Agent[];
  tasks: Task[];
  events: AuditEvent[];
  contextEntries: ContextEntry[];
  onSelectAgent: (agent: Agent) => void;
  onSelectTask: (task: Task) => void;
  onSelectEvent: (event: AuditEvent) => void;
  onNavigate: (tab: string) => void;
}

export function OverviewPage({
  agents,
  tasks,
  events,
  contextEntries,
  onSelectAgent,
  onSelectTask,
  onSelectEvent,
  onNavigate,
}: OverviewPageProps) {
  // Metric calculations
  const activeAgents = agents.filter((a) => !a.revoked && a.status !== 'offline').length;
  const inFlightTasks = tasks.filter((t) => t.status === 'in_progress' || t.status === 'review').length;
  const rejectedEvents = events.filter((e) => !e.accepted).length;
  const recentContextEntries = [...contextEntries].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const latestContext = recentContextEntries[0];

  // Pipeline counts
  const pipeline = {
    backlog: tasks.filter((t) => t.status === 'backlog'),
    ready: tasks.filter((t) => t.status === 'ready'),
    in_progress: tasks.filter((t) => t.status === 'in_progress'),
    review: tasks.filter((t) => t.status === 'review'),
    done: tasks.filter((t) => t.status === 'done'),
  };

  return (
    <div className="page-container">
      {/* Top Banner */}
      <div
        style={{
          background: 'linear-gradient(90deg, #0f1b29 0%, #0d131f 100%)',
          border: '1px solid #1F2937',
          borderRadius: 'var(--radius-md)',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#F3F4F6' }}>
              Sampark Control Mesh
            </h1>
            <span className="badge badge-mint">v1.0.0 local-first</span>
          </div>
          <p style={{ fontSize: '0.825rem', color: '#9CA3AF', marginTop: '0.25rem' }}>
            A permissioned memory layer for coding agents. Exchanges small, structured, validated project updates — never raw chat transcripts.
          </p>
        </div>
        <div style={{ textAlign: 'right', display: 'none' /* hidden on mobile */ }}>
          <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>CORE SAFETY PRINCIPLE</div>
          <div style={{ fontSize: '0.8rem', color: '#10B981', fontWeight: 600 }}>
            "Agent messages are untrusted data"
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div>
            <div className="metric-label">Active Agents</div>
            <div className="metric-val" style={{ color: '#10B981' }}>
              {activeAgents} <span style={{ fontSize: '0.9rem', color: '#6B7280', fontWeight: 500 }}>/ {agents.length}</span>
            </div>
            <div style={{ fontSize: '0.725rem', color: '#9CA3AF', marginTop: '0.2rem' }}>Local verified nodes</div>
          </div>
          <div style={{ background: '#10b98118', padding: '0.65rem', borderRadius: 'var(--radius-sm)' }}>
            <Users size={24} color="#10B981" />
          </div>
        </div>

        <div className="metric-card">
          <div>
            <div className="metric-label">Tasks In Flight</div>
            <div className="metric-val" style={{ color: '#06B6D4' }}>
              {inFlightTasks} <span style={{ fontSize: '0.9rem', color: '#6B7280', fontWeight: 500 }}>/ {tasks.length}</span>
            </div>
            <div style={{ fontSize: '0.725rem', color: '#9CA3AF', marginTop: '0.2rem' }}>In Progress & Review</div>
          </div>
          <div style={{ background: '#06b6d418', padding: '0.65rem', borderRadius: 'var(--radius-sm)' }}>
            <ListTodo size={24} color="#06B6D4" />
          </div>
        </div>

        <div className="metric-card">
          <div>
            <div className="metric-label">Context Updates</div>
            <div className="metric-val" style={{ color: '#3B82F6' }}>
              {contextEntries.length}
            </div>
            <div style={{ fontSize: '0.725rem', color: '#9CA3AF', marginTop: '0.2rem' }}>Structured memory entries</div>
          </div>
          <div style={{ background: '#3b82f618', padding: '0.65rem', borderRadius: 'var(--radius-sm)' }}>
            <FileCode2 size={24} color="#3B82F6" />
          </div>
        </div>

        <div className="metric-card">
          <div>
            <div className="metric-label">Blocked Cross-Scope</div>
            <div className="metric-val" style={{ color: rejectedEvents > 0 ? '#EF4444' : '#10B981' }}>
              {rejectedEvents}
            </div>
            <div style={{ fontSize: '0.725rem', color: '#9CA3AF', marginTop: '0.2rem' }}>Policy engine rejections</div>
          </div>
          <div style={{ background: rejectedEvents > 0 ? '#ef444418' : '#10b98118', padding: '0.65rem', borderRadius: 'var(--radius-sm)' }}>
            <AlertOctagon size={24} color={rejectedEvents > 0 ? '#EF4444' : '#10B981'} />
          </div>
        </div>
      </div>

      {/* Main Interactive Topology Mesh */}
      <div style={{ marginBottom: '1.5rem' }}>
        <MeshGraph
          agents={agents}
          tasks={tasks}
          onSelectAgent={onSelectAgent}
          onSelectTask={onSelectTask}
        />
      </div>

      {/* Two Column Layout: Mini Kanban & Live Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Left: Task Pipeline Mini-Kanban */}
        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <ListTodo size={16} color="#06B6D4" />
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#F3F4F6' }}>Task Pipeline</span>
            </div>
            <button onClick={() => onNavigate('tasks')} className="btn btn-secondary btn-sm">
              <span>View Full Board</span>
              <ArrowRight size={13} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.6rem' }}>
            {(['backlog', 'ready', 'in_progress', 'review', 'done'] as const).map((status) => {
              const items = pipeline[status];
              const titleMap = {
                backlog: 'Backlog',
                ready: 'Ready',
                in_progress: 'In Progress',
                review: 'Review',
                done: 'Done',
              };
              return (
                <div
                  key={status}
                  style={{
                    background: '#090E17',
                    border: '1px solid #1F2937',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.65rem',
                    minHeight: '160px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: '#9CA3AF',
                      textTransform: 'uppercase',
                      marginBottom: '0.5rem',
                      borderBottom: '1px solid #1F2937',
                      paddingBottom: '0.35rem',
                    }}
                  >
                    <span>{titleMap[status]}</span>
                    <span style={{ background: '#1F2937', color: '#E5E7EB', padding: '0.1rem 0.35rem', borderRadius: '9999px' }}>
                      {items.length}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    {items.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => onSelectTask(t)}
                        style={{
                          background: '#111827',
                          border: '1px solid #1F2937',
                          borderRadius: '4px',
                          padding: '0.45rem 0.55rem',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                        }}
                      >
                        <div style={{ fontWeight: 600, color: '#F3F4F6', lineHeight: 1.25 }}>
                          {t.title.length > 28 ? t.title.slice(0, 26) + '...' : t.title}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem', fontSize: '0.675rem', color: '#6B7280' }}>
                          <span className="mono">v{t.contextVersion}</span>
                          <span>{t.requiredScope}</span>
                        </div>
                      </div>
                    ))}
                    {items.length === 0 && (
                      <div style={{ fontSize: '0.7rem', color: '#4B5563', textAlign: 'center', marginTop: '1.5rem' }}>
                        None
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Live Activity Stream */}
        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Clock size={16} color="#10B981" />
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#F3F4F6' }}>Live Audit Stream</span>
            </div>
            <button onClick={() => onNavigate('audit')} className="btn btn-secondary btn-sm">
              <span>All Events</span>
              <ArrowRight size={13} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '250px', overflowY: 'auto' }}>
            {events.slice(0, 5).map((evt) => {
              const actor = agents.find((a) => a.id === evt.actorAgentId);
              const actorName = actor ? actor.displayName : evt.actorAgentId;

              return (
                <div
                  key={evt.id}
                  onClick={() => onSelectEvent(evt)}
                  style={{
                    background: evt.accepted ? '#090E17' : 'rgba(239, 68, 68, 0.08)',
                    border: `1px solid ${evt.accepted ? '#1F2937' : '#ef444455'}`,
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.55rem 0.75rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.6rem',
                  }}
                >
                  <div style={{ marginTop: '2px' }}>
                    {evt.accepted ? (
                      <CheckCircle2 size={15} color="#10B981" />
                    ) : (
                      <AlertOctagon size={15} color="#EF4444" />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                      <span style={{ fontWeight: 600, color: evt.accepted ? '#F3F4F6' : '#EF4444' }}>
                        {evt.payloadSummary || evt.eventType}
                      </span>
                      <span style={{ color: '#6B7280', fontSize: '0.675rem' }}>
                        {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#9CA3AF', marginTop: '0.15rem' }}>
                      Actor: <span style={{ color: '#38BDF8' }}>{actorName}</span> • {evt.reason.slice(0, 60)}...
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Panels: "Why Sampark?" and "Recent Context Delta" */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Why Sampark */}
        <div className="panel" style={{ background: '#0D131F' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.75rem' }}>
            <ShieldCheck size={18} color="#10B981" />
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#F3F4F6' }}>Why Sampark?</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.8rem', color: '#9CA3AF' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <span style={{ color: '#10B981', fontWeight: 700 }}>•</span>
              <div>
                <strong style={{ color: '#F3F4F6' }}>Structured Context, Not Transcripts:</strong> Exchanging small typed updates (API contracts, test results) avoids context window bloat and cross-agent hallucination.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <span style={{ color: '#06B6D4', fontWeight: 700 }}>•</span>
              <div>
                <strong style={{ color: '#F3F4F6' }}>Permission Checks Before Handoff:</strong> Agents can only claim or publish changes inside their permitted scopes (frontend, backend, testing, security).
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <span style={{ color: '#3B82F6', fontWeight: 700 }}>•</span>
              <div>
                <strong style={{ color: '#F3F4F6' }}>Immutable Local Audit Trail:</strong> Every accepted task transition and rejected unauthorized access is persisted to append-only storage.
              </div>
            </div>
          </div>
        </div>

        {/* Recent Context Delta */}
        <div className="panel" style={{ background: '#0D131F' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Sparkles size={18} color="#06B6D4" />
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#F3F4F6' }}>Latest Context Delta</span>
            </div>
            <button onClick={() => onNavigate('context')} className="btn btn-secondary btn-sm">
              <span>Inspect Deltas</span>
            </button>
          </div>

          {latestContext ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <span className="badge badge-cyan">{latestContext.kind}</span>
                <span className="badge badge-mint">v{latestContext.version}</span>
                <span style={{ fontSize: '0.825rem', fontWeight: 600, color: '#F3F4F6' }}>{latestContext.title}</span>
              </div>
              <div style={{ fontSize: '0.785rem', color: '#9CA3AF', background: '#090E17', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid #1F2937' }}>
                <div style={{ color: '#6B7280', fontSize: '0.7rem', marginBottom: '0.2rem' }}>COMPACT BRIEF:</div>
                {latestContext.summary}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>No context entries registered.</div>
          )}
        </div>
      </div>
    </div>
  );
}
