import React, { useState } from 'react';
import { AuditEvent, Agent, Task } from '../types';
import {
  ScrollText,
  Filter,
  Search,
  CheckCircle2,
  AlertTriangle,
  Eye,
  ShieldAlert,
  ArrowRight,
  Clock,
} from 'lucide-react';

interface AuditTrailPageProps {
  events: AuditEvent[];
  agents: Agent[];
  tasks: Task[];
  onSelectEvent: (event: AuditEvent) => void;
}

export function AuditTrailPage({ events, agents, tasks, onSelectEvent }: AuditTrailPageProps) {
  const [search, setSearch] = useState('');
  const [acceptedFilter, setAcceptedFilter] = useState<'all' | 'true' | 'false'>('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [agentFilter, setAgentFilter] = useState('all');

  const filteredEvents = events.filter((e) => {
    const matchesSearch =
      e.reason.toLowerCase().includes(search.toLowerCase()) ||
      e.payloadSummary.toLowerCase().includes(search.toLowerCase()) ||
      e.correlationId.toLowerCase().includes(search.toLowerCase());

    const matchesAccepted =
      acceptedFilter === 'all' ||
      (acceptedFilter === 'true' && e.accepted) ||
      (acceptedFilter === 'false' && !e.accepted);

    const matchesType = typeFilter === 'all' || e.eventType === typeFilter;
    const matchesAgent = agentFilter === 'all' || e.actorAgentId === agentFilter;

    return matchesSearch && matchesAccepted && matchesType && matchesAgent;
  });

  const eventTypes = Array.from(new Set(events.map((e) => e.eventType)));

  return (
    <div className="page-container">
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#F3F4F6' }}>Immutable Audit Log</h1>
            <span className="badge badge-mint">{events.length} events recorded</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#9CA3AF', marginTop: '0.2rem' }}>
            Every accepted state change and policy-rejected operation is recorded to local append-only storage.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="panel"
        style={{
          padding: '0.85rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search size={16} color="#6B7280" style={{ position: 'absolute', left: '10px', top: '10px' }} />
          <input
            type="text"
            className="input"
            style={{ paddingLeft: '2.2rem' }}
            placeholder="Search reason, payload, correlation ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            className="select"
            style={{ width: 'auto' }}
            value={acceptedFilter}
            onChange={(e) => setAcceptedFilter(e.target.value as any)}
          >
            <option value="all">All Statuses (Accepted & Rejected)</option>
            <option value="true">Accepted Only</option>
            <option value="false">Rejected Only</option>
          </select>

          <select
            className="select"
            style={{ width: 'auto' }}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">All Event Types</option>
            {eventTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select
            className="select"
            style={{ width: 'auto' }}
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
          >
            <option value="all">All Agents</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.displayName} ({a.role})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Events List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {filteredEvents.map((evt) => {
          const actor = agents.find((a) => a.id === evt.actorAgentId);
          const actorName = actor ? actor.displayName : evt.actorAgentId;

          return (
            <div
              key={evt.id}
              className="panel"
              onClick={() => onSelectEvent(evt)}
              style={{
                cursor: 'pointer',
                background: evt.accepted ? '#111827' : 'rgba(239, 68, 68, 0.08)',
                border: `1px solid ${evt.accepted ? '#1F2937' : '#EF4444'}`,
                padding: '1rem 1.25rem',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '1rem',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', flex: 1, minWidth: 0 }}>
                <div style={{ marginTop: '2px', flexShrink: 0 }}>
                  {evt.accepted ? (
                    <div style={{ background: '#10b98122', padding: '0.35rem', borderRadius: 'var(--radius-sm)' }}>
                      <CheckCircle2 size={18} color="#10B981" />
                    </div>
                  ) : (
                    <div style={{ background: '#ef444422', padding: '0.35rem', borderRadius: 'var(--radius-sm)' }}>
                      <AlertTriangle size={18} color="#EF4444" />
                    </div>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                    <span className={`badge ${evt.accepted ? 'badge-mint' : 'badge-red'}`} style={{ fontSize: '0.7rem' }}>
                      {evt.accepted ? 'ACCEPTED' : 'POLICY REJECTED'}
                    </span>
                    <span className="badge badge-muted" style={{ fontSize: '0.7rem' }}>
                      {evt.eventType}
                    </span>
                    {evt.taskId && (
                      <span className="mono" style={{ fontSize: '0.7rem', color: '#06B6D4' }}>
                        task: {evt.taskId}
                      </span>
                    )}
                    <span className="mono" style={{ fontSize: '0.675rem', color: '#6B7280' }}>
                      {evt.correlationId}
                    </span>
                  </div>

                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: evt.accepted ? '#F3F4F6' : '#EF4444', marginBottom: '0.25rem' }}>
                    {evt.payloadSummary}
                  </div>

                  <div style={{ fontSize: '0.8rem', color: '#9CA3AF', lineHeight: 1.4 }}>
                    {evt.reason}
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.45rem', fontSize: '0.725rem', color: '#6B7280' }}>
                    <span>
                      Actor: <strong style={{ color: '#D1D5DB' }}>{actorName}</strong>
                    </span>
                    {evt.targetAgentId && (
                      <span>
                        Target: <strong style={{ color: '#D1D5DB' }}>{evt.targetAgentId}</strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                <div style={{ fontSize: '0.725rem', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Clock size={12} />
                  <span>{new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                </div>
                <button className="btn btn-secondary btn-sm" style={{ padding: '0.25rem 0.55rem', fontSize: '0.725rem' }}>
                  <Eye size={12} />
                  <span>Inspect JSON</span>
                </button>
              </div>
            </div>
          );
        })}

        {filteredEvents.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#6B7280' }}>
            No audit events matched current filter parameters.
          </div>
        )}
      </div>
    </div>
  );
}
