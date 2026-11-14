import React, { useState } from 'react';
import {
  X,
  Bot,
  Shield,
  Heart,
  KeyRound,
  Ban,
  CheckCircle2,
  Copy,
  Clock,
  Briefcase,
} from 'lucide-react';
import { Agent, Task } from '../types';
import { api } from '../api/client';
import { useToast } from './Toast';

interface AgentDetailDrawerProps {
  agent: Agent | null;
  tasks: Task[];
  onClose: () => void;
  onAgentUpdated: () => void;
  onSelectTask: (task: Task) => void;
}

export function AgentDetailDrawer({
  agent,
  tasks,
  onClose,
  onAgentUpdated,
  onSelectTask,
}: AgentDetailDrawerProps) {
  const { showToast } = useToast();
  const [copiedSession, setCopiedSession] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!agent) return null;

  const assignedTasks = tasks.filter((t) => t.ownerAgentId === agent.id);
  const isSessionExpired = new Date(agent.sessionExpiresAt).getTime() <= Date.now();

  const handleCopySession = () => {
    navigator.clipboard.writeText(agent.sessionId);
    setCopiedSession(true);
    showToast('info', 'Session ID Copied', agent.sessionId);
    setTimeout(() => setCopiedSession(false), 2000);
  };

  const handleHeartbeat = async () => {
    setIsProcessing(true);
    try {
      await api.heartbeatAgent(agent.id);
      showToast('success', 'Heartbeat Acknowledged', `Session lease extended for ${agent.displayName}`);
      onAgentUpdated();
    } catch (err: any) {
      showToast('error', 'Heartbeat Failed', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRenewSession = async () => {
    setIsProcessing(true);
    try {
      await api.renewAgentSession(agent.id);
      showToast('success', 'Session Renewed', `New session lease issued for ${agent.displayName}`);
      onAgentUpdated();
    } catch (err: any) {
      showToast('error', 'Renewal Failed', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRevoke = async () => {
    if (!confirm(`Are you sure you want to revoke credentials for agent "${agent.displayName}"? All further actions will be blocked.`)) {
      return;
    }
    setIsProcessing(true);
    try {
      await api.revokeAgent(agent.id);
      showToast('warning', 'Agent Revoked', `Credentials for ${agent.displayName} revoked by admin`);
      onAgentUpdated();
    } catch (err: any) {
      showToast('error', 'Revocation Failed', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 'var(--radius-sm)',
                background: agent.revoked ? '#ef444422' : '#10b98122',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${agent.revoked ? '#EF4444' : '#10B981'}`,
              }}
            >
              <Bot size={24} color={agent.revoked ? '#EF4444' : '#10B981'} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#F3F4F6' }}>{agent.displayName}</h2>
                <span className={`badge ${agent.revoked ? 'badge-red' : 'badge-mint'}`}>
                  {agent.revoked ? 'REVOKED' : agent.status.toUpperCase()}
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '0.15rem' }}>
                {agent.role} • <span style={{ color: '#06B6D4' }}>{agent.provider} (Simulated Adapter)</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Session & Lease Security Card */}
        <div className="panel" style={{ marginBottom: '1.25rem', background: '#0D131F' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: '#F3F4F6' }}>
              <KeyRound size={15} color="#10B981" />
              Dynamic Mesh Identity
            </div>
            {agent.revoked ? (
              <span className="badge badge-red">Revoked</span>
            ) : isSessionExpired ? (
              <span className="badge badge-amber">Expired</span>
            ) : (
              <span className="badge badge-mint">Session Verified</span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.775rem' }}>
            <div>
              <div style={{ color: '#6B7280' }}>Node ID</div>
              <div className="mono" style={{ color: '#F3F4F6', fontWeight: 600 }}>{agent.id}</div>
            </div>
            <div>
              <div style={{ color: '#6B7280' }}>Session Lease</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span className="mono" style={{ color: '#06B6D4' }}>{agent.sessionId}</span>
                <button
                  onClick={handleCopySession}
                  style={{ background: 'none', border: 'none', color: copiedSession ? '#10B981' : '#6B7280', cursor: 'pointer' }}
                  title="Copy session ID"
                >
                  <Copy size={12} />
                </button>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '0.75rem', fontSize: '0.725rem', color: '#9CA3AF', borderTop: '1px solid #1F2937', paddingTop: '0.5rem' }}>
            <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} />
            Expires: <span className="mono">{new Date(agent.sessionExpiresAt).toLocaleString()}</span>
          </div>

          {/* Identity Actions */}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.85rem' }}>
            <button
              onClick={handleHeartbeat}
              disabled={isProcessing || agent.revoked}
              className="btn btn-secondary btn-sm"
              title="Send heartbeat to extend active session lease"
            >
              <Heart size={13} color="#10B981" />
              <span>Heartbeat</span>
            </button>
            <button
              onClick={handleRenewSession}
              disabled={isProcessing}
              className="btn btn-cyan btn-sm"
              title="Issue brand new session lease"
            >
              <KeyRound size={13} />
              <span>Renew Session</span>
            </button>
            {!agent.revoked && (
              <button
                onClick={handleRevoke}
                disabled={isProcessing}
                className="btn btn-danger btn-sm"
                title="Immediately revoke agent access"
              >
                <Ban size={13} />
                <span>Revoke</span>
              </button>
            )}
          </div>
        </div>

        {/* Permissions & Scopes */}
        <div className="panel" style={{ marginBottom: '1.25rem', background: '#0D131F' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: '#F3F4F6', marginBottom: '0.65rem' }}>
            <Shield size={15} color="#06B6D4" />
            Security & Scope Boundaries
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '0.725rem', color: '#6B7280', marginBottom: '0.35rem' }}>PERMITTED SCOPES:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {agent.allowedScopes.map((scope) => (
                <span key={scope} className="badge badge-cyan">
                  {scope}
                </span>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.725rem', color: '#6B7280', marginBottom: '0.35rem' }}>ALLOWED ACTIONS:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {agent.allowedActions.map((action) => (
                <span key={action} className="badge badge-mint" style={{ fontSize: '0.7rem' }}>
                  {action}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Capacity & Capabilities */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div className="panel" style={{ background: '#0D131F', padding: '0.85rem' }}>
            <div style={{ fontSize: '0.725rem', color: '#6B7280', fontWeight: 600 }}>POWER RATING</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10B981', marginTop: '0.2rem' }}>
              {agent.powerScore} <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>/ 5</span>
            </div>
          </div>

          <div className="panel" style={{ background: '#0D131F', padding: '0.85rem' }}>
            <div style={{ fontSize: '0.725rem', color: '#6B7280', fontWeight: 600 }}>TASK CAPACITY</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#06B6D4', marginTop: '0.2rem' }}>
              {agent.currentTaskCount} <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>/ {agent.maxConcurrentTasks} max</span>
            </div>
          </div>
        </div>

        {/* Capabilities list */}
        <div className="panel" style={{ marginBottom: '1.25rem', background: '#0D131F' }}>
          <div style={{ fontSize: '0.725rem', color: '#6B7280', fontWeight: 600, marginBottom: '0.4rem' }}>
            VERIFIED CAPABILITIES
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
            {agent.capabilities.map((cap) => (
              <span key={cap} className="badge badge-muted">
                {cap}
              </span>
            ))}
          </div>
        </div>

        {/* Assigned Tasks */}
        <div className="panel" style={{ background: '#0D131F' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: '#F3F4F6', marginBottom: '0.65rem' }}>
            <Briefcase size={15} color="#10B981" />
            In-Flight Tasks ({assignedTasks.length})
          </div>
          {assignedTasks.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {assignedTasks.map((t) => (
                <div
                  key={t.id}
                  onClick={() => onSelectTask(t)}
                  style={{
                    padding: '0.55rem 0.75rem',
                    background: '#111827',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid #1F2937',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#F3F4F6' }}>{t.title}</div>
                  <span className={`badge ${t.status === 'done' ? 'badge-mint' : 'badge-cyan'}`} style={{ fontSize: '0.675rem' }}>
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>No tasks currently in flight.</div>
          )}
        </div>
      </div>
    </div>
  );
}
