import React, { useState } from 'react';
import { Agent, Task } from '../types';
import { Bot, Plus, Search, Filter, Copy, Check, Shield, Cpu, Activity } from 'lucide-react';
import { useToast } from '../components/Toast';

interface AgentsPageProps {
  agents: Agent[];
  tasks: Task[];
  onSelectAgent: (agent: Agent) => void;
  onOpenCreateModal: () => void;
}

export function AgentsPage({ agents, tasks, onSelectAgent, onOpenCreateModal }: AgentsPageProps) {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredAgents = agents.filter((a) => {
    const matchesSearch =
      a.displayName.toLowerCase().includes(search.toLowerCase()) ||
      a.role.toLowerCase().includes(search.toLowerCase()) ||
      a.capabilities.some((c) => c.toLowerCase().includes(search.toLowerCase()));

    const matchesRole = roleFilter === 'all' || a.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleCopySession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(sessionId);
    setCopiedId(sessionId);
    showToast('info', 'Session ID Copied', sessionId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusBadge = (agent: Agent) => {
    if (agent.revoked) return <span className="badge badge-red">REVOKED</span>;
    switch (agent.status) {
      case 'online':
        return <span className="badge badge-mint"><Activity size={10} /> ONLINE</span>;
      case 'busy':
        return <span className="badge badge-cyan"><Cpu size={10} /> BUSY</span>;
      case 'idle':
        return <span className="badge badge-amber">IDLE</span>;
      default:
        return <span className="badge badge-muted">OFFLINE</span>;
    }
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#F3F4F6' }}>Agent Mesh Registry</h1>
            <span className="badge badge-mint">{agents.length} nodes connected</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#9CA3AF', marginTop: '0.2rem' }}>
            Simulated and local adapters with verified cryptographic leases, role capabilities, and scope boundaries.
          </p>
        </div>
        <button onClick={onOpenCreateModal} className="btn btn-primary">
          <Plus size={16} />
          <span>Register Agent</span>
        </button>
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
            placeholder="Search by name, role, capability (e.g. react, node)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#6B7280', fontSize: '0.8rem' }}>
            <Filter size={14} />
            <span>Role:</span>
          </div>
          <select
            className="select"
            style={{ width: 'auto' }}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="Coordinator">Coordinator</option>
            <option value="Frontend Builder">Frontend Builder</option>
            <option value="Backend Builder">Backend Builder</option>
            <option value="Test Runner">Test Runner</option>
            <option value="Security Reviewer">Security Reviewer</option>
          </select>

          <select
            className="select"
            style={{ width: 'auto' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="online">Online</option>
            <option value="busy">Busy</option>
            <option value="idle">Idle</option>
            <option value="offline">Offline</option>
          </select>
        </div>
      </div>

      {/* Agent Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
        {filteredAgents.map((agent) => {
          const assignedCount = tasks.filter((t) => t.ownerAgentId === agent.id).length;
          const isExpired = new Date(agent.sessionExpiresAt).getTime() <= Date.now();

          return (
            <div
              key={agent.id}
              className="panel"
              onClick={() => onSelectAgent(agent)}
              style={{
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.15s ease',
                position: 'relative',
              }}
            >
              <div>
                {/* Card Top Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 'var(--radius-sm)',
                        background: agent.revoked ? '#ef444422' : '#10b98122',
                        border: `1px solid ${agent.revoked ? '#EF4444' : '#10B981'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Bot size={20} color={agent.revoked ? '#EF4444' : '#10B981'} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: '#F3F4F6' }}>
                        {agent.displayName}
                      </div>
                      <div style={{ fontSize: '0.725rem', color: '#9CA3AF' }}>{agent.role}</div>
                    </div>
                  </div>

                  <div>{getStatusBadge(agent)}</div>
                </div>

                {/* Provider Tag */}
                <div style={{ marginBottom: '0.75rem' }}>
                  <span
                    style={{
                      background: '#1F2937',
                      color: '#06B6D4',
                      fontSize: '0.7rem',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      fontWeight: 600,
                    }}
                  >
                    {agent.provider} (Simulated Adapter)
                  </span>
                </div>

                {/* Power & Capacity Stats */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.5rem',
                    background: '#090E17',
                    padding: '0.65rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '0.75rem',
                    border: '1px solid #1F2937',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.675rem', color: '#6B7280' }}>POWER SCORE</div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#10B981' }}>
                      {agent.powerScore} <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>/ 5</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.675rem', color: '#6B7280' }}>TASK LOAD</div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#38BDF8' }}>
                      {agent.currentTaskCount} <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>/ {agent.maxConcurrentTasks} max</span>
                    </div>
                  </div>
                </div>

                {/* Permitted Scopes */}
                <div style={{ marginBottom: '0.65rem' }}>
                  <div style={{ fontSize: '0.685rem', color: '#6B7280', marginBottom: '0.25rem', fontWeight: 600 }}>
                    PERMITTED SCOPES:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                    {agent.allowedScopes.map((scope) => (
                      <span key={scope} className="badge badge-cyan" style={{ fontSize: '0.675rem' }}>
                        {scope}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Capabilities Chips */}
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.685rem', color: '#6B7280', marginBottom: '0.25rem', fontWeight: 600 }}>
                    CAPABILITIES:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                    {agent.capabilities.slice(0, 4).map((cap) => (
                      <span key={cap} className="badge badge-muted" style={{ fontSize: '0.675rem' }}>
                        {cap}
                      </span>
                    ))}
                    {agent.capabilities.length > 4 && (
                      <span style={{ fontSize: '0.675rem', color: '#6B7280', alignSelf: 'center' }}>
                        +{agent.capabilities.length - 4} more
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Footer: Session ID and expiry */}
              <div
                style={{
                  borderTop: '1px solid #1F2937',
                  paddingTop: '0.65rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.725rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span className="mono" style={{ color: '#9CA3AF' }}>
                    {agent.sessionId.slice(0, 11)}...
                  </span>
                  <button
                    onClick={(e) => handleCopySession(e, agent.sessionId)}
                    style={{ background: 'none', border: 'none', color: copiedId === agent.sessionId ? '#10B981' : '#6B7280', cursor: 'pointer', padding: '2px' }}
                    title="Copy full session lease ID"
                  >
                    {copiedId === agent.sessionId ? <Check size={12} /> : <Copy size={12} />}
                  </button>
                </div>

                <div>
                  {agent.revoked ? (
                    <span style={{ color: '#EF4444', fontWeight: 600 }}>Revoked</span>
                  ) : isExpired ? (
                    <span style={{ color: '#F59E0B' }}>Lease expired</span>
                  ) : (
                    <span style={{ color: '#10B981' }}>Lease active</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
