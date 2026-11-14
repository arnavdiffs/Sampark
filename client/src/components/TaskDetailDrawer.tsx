import React, { useState } from 'react';
import {
  X,
  Sparkles,
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCode,
  GitBranch,
  Layers,
  RotateCcw,
} from 'lucide-react';
import { Task, Agent, RoutingRecommendation, TaskStatus } from '../types';
import { api } from '../api/client';
import { useToast } from './Toast';

interface TaskDetailDrawerProps {
  task: Task | null;
  agents: Agent[];
  onClose: () => void;
  onTaskUpdated: () => void;
  onOpenHandoff: (task: Task) => void;
  onNavigateToContext: (taskId: string) => void;
}

export function TaskDetailDrawer({
  task,
  agents,
  onClose,
  onTaskUpdated,
  onOpenHandoff,
  onNavigateToContext,
}: TaskDetailDrawerProps) {
  const { showToast } = useToast();
  const [routingRec, setRoutingRec] = useState<RoutingRecommendation | null>(null);
  const [isLoadingRec, setIsLoadingRec] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  if (!task) return null;

  const owner = task.ownerAgentId ? agents.find((a) => a.id === task.ownerAgentId) : null;

  const handleFetchRouting = async () => {
    setIsLoadingRec(true);
    try {
      const rec = await api.getRoutingRecommendation(task.id);
      setRoutingRec(rec);
      showToast('info', 'Routing Recommendation Computed', rec.explanation);
    } catch (err: any) {
      showToast('error', 'Routing Failed', err.message);
    } finally {
      setIsLoadingRec(false);
    }
  };

  const handleApplyRouting = async () => {
    if (!routingRec?.recommendedAgent) return;
    try {
      await api.assignTask(task.id, routingRec.recommendedAgent.id);
      showToast('success', 'Task Assigned', `Assigned to ${routingRec.recommendedAgent.displayName}`);
      onTaskUpdated();
      setRoutingRec(null);
    } catch (err: any) {
      showToast('error', 'Assignment Blocked', err.message);
    }
  };

  const handleStatusChange = async (targetStatus: TaskStatus, isReopen: boolean = false) => {
    setIsUpdatingStatus(true);
    try {
      await api.updateTaskStatus(task.id, targetStatus, task.ownerAgentId || undefined, isReopen);
      showToast('success', 'Status Updated', `Task moved to ${targetStatus}`);
      onTaskUpdated();
    } catch (err: any) {
      showToast('error', 'Transition Rejected', err.message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getPriorityBadgeClass = (p: string) => {
    switch (p) {
      case 'critical':
        return 'badge-red';
      case 'high':
        return 'badge-amber';
      case 'medium':
        return 'badge-cyan';
      default:
        return 'badge-muted';
    }
  };

  const getStatusBadgeClass = (s: string) => {
    switch (s) {
      case 'done':
        return 'badge-mint';
      case 'in_progress':
        return 'badge-cyan';
      case 'review':
        return 'badge-amber';
      case 'blocked':
        return 'badge-red';
      default:
        return 'badge-muted';
    }
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
              <span className={`badge ${getStatusBadgeClass(task.status)}`}>{task.status.toUpperCase()}</span>
              <span className={`badge ${getPriorityBadgeClass(task.priority)}`}>{task.priority} priority</span>
              <span className="badge badge-muted">scope: {task.requiredScope}</span>
              <span className="badge badge-mint">context v{task.contextVersion}</span>
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#F3F4F6' }}>{task.title}</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Description */}
        <div style={{ marginBottom: '1.5rem', color: '#9CA3AF', fontSize: '0.85rem', lineHeight: 1.5 }}>
          {task.description || 'No description provided.'}
        </div>

        {/* Current Owner & Handoff Card */}
        <div className="panel" style={{ marginBottom: '1.25rem', background: '#0D131F' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.725rem', color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>
                Assigned Owner
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                {owner ? (
                  <>
                    <span style={{ fontWeight: 600, color: '#F3F4F6' }}>{owner.displayName}</span>
                    <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>({owner.role} • {owner.provider})</span>
                  </>
                ) : (
                  <span style={{ color: '#F59E0B', fontSize: '0.85rem', fontWeight: 600 }}>Unassigned (Ready for Routing)</span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => onOpenHandoff(task)} className="btn btn-secondary btn-sm" title="Initiate handoff">
                <ArrowRightLeft size={14} />
                <span>Handoff</span>
              </button>
            </div>
          </div>
        </div>

        {/* Deterministic Auto-Route Section */}
        <div className="panel" style={{ marginBottom: '1.25rem', background: '#0D131F', borderColor: '#1E293B' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Sparkles size={16} color="#06B6D4" />
              <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#F3F4F6' }}>Deterministic Routing Policy</span>
            </div>
            <button
              onClick={handleFetchRouting}
              disabled={isLoadingRec}
              className="btn btn-cyan btn-sm"
            >
              {isLoadingRec ? 'Computing...' : 'Compute Recommendation'}
            </button>
          </div>

          {routingRec ? (
            <div style={{ marginTop: '0.5rem' }}>
              <div style={{ padding: '0.65rem', background: '#111827', borderRadius: 'var(--radius-sm)', border: '1px solid #1F2937', marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.8rem', color: '#10B981', fontWeight: 600, marginBottom: '0.2rem' }}>
                  ✓ Recommended Candidate: {routingRec.recommendedAgent?.displayName || 'None'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#9CA3AF', lineHeight: 1.4 }}>
                  {routingRec.explanation}
                </div>
              </div>

              {routingRec.recommendedAgent && (
                <button onClick={handleApplyRouting} className="btn btn-primary btn-sm" style={{ width: '100%' }}>
                  Assign to {routingRec.recommendedAgent.displayName}
                </button>
              )}
            </div>
          ) : (
            <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
              Evaluates capabilities ([{task.requiredCapabilities.join(', ')}]), matching scope ('{task.requiredScope}'), active session, powerScore, and remaining slots.
            </div>
          )}
        </div>

        {/* Lifecycle Transitions */}
        <div className="panel" style={{ marginBottom: '1.25rem', background: '#0D131F' }}>
          <div style={{ fontSize: '0.75rem', color: '#6B7280', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.6rem' }}>
            Task State Transition
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {task.status === 'ready' && (
              <button
                onClick={() => handleStatusChange('in_progress')}
                disabled={isUpdatingStatus}
                className="btn btn-primary btn-sm"
              >
                Start In Progress →
              </button>
            )}
            {task.status === 'in_progress' && (
              <>
                <button
                  onClick={() => handleStatusChange('review')}
                  disabled={isUpdatingStatus}
                  className="btn btn-cyan btn-sm"
                >
                  Submit for Review
                </button>
                <button
                  onClick={() => handleStatusChange('done')}
                  disabled={isUpdatingStatus}
                  className="btn btn-primary btn-sm"
                >
                  Mark Complete
                </button>
                <button
                  onClick={() => handleStatusChange('blocked')}
                  disabled={isUpdatingStatus}
                  className="btn btn-danger btn-sm"
                >
                  Mark Blocked
                </button>
              </>
            )}
            {task.status === 'review' && (
              <>
                <button
                  onClick={() => handleStatusChange('done')}
                  disabled={isUpdatingStatus}
                  className="btn btn-primary btn-sm"
                >
                  Approve & Done
                </button>
                <button
                  onClick={() => handleStatusChange('in_progress')}
                  disabled={isUpdatingStatus}
                  className="btn btn-secondary btn-sm"
                >
                  Request Changes
                </button>
              </>
            )}
            {task.status === 'blocked' && (
              <button
                onClick={() => handleStatusChange('in_progress')}
                disabled={isUpdatingStatus}
                className="btn btn-primary btn-sm"
              >
                Unblock & Resume
              </button>
            )}
            {task.status === 'done' && (
              <button
                onClick={() => handleStatusChange('ready', true)}
                disabled={isUpdatingStatus}
                className="btn btn-secondary btn-sm"
              >
                <RotateCcw size={13} />
                <span>Reopen Task</span>
              </button>
            )}
          </div>
        </div>

        {/* Evidence & Context Links */}
        <div className="panel" style={{ marginBottom: '1.25rem', background: '#0D131F' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>
              Structured Project Memory
            </span>
            <button onClick={() => onNavigateToContext(task.id)} className="btn btn-cyan btn-sm">
              <FileCode size={13} />
              <span>Inspect Context Timeline</span>
            </button>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#F3F4F6', background: '#111827', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ color: '#10B981', fontWeight: 600, fontSize: '0.725rem', marginBottom: '0.2rem' }}>
              LATEST VERIFIED EVIDENCE:
            </div>
            {task.latestEvidenceSummary || 'No evidence submitted yet.'}
          </div>
        </div>

        {/* File Scopes and Git Branch */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.75rem', color: '#9CA3AF' }}>
          <div className="panel" style={{ background: '#0D131F', padding: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#6B7280', fontWeight: 600, marginBottom: '0.3rem' }}>
              <GitBranch size={13} />
              Repository & Branch
            </div>
            <div className="mono" style={{ color: '#F3F4F6' }}>{task.repository}</div>
            <div className="mono" style={{ color: '#06B6D4' }}>{task.branch}</div>
          </div>

          <div className="panel" style={{ background: '#0D131F', padding: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#6B7280', fontWeight: 600, marginBottom: '0.3rem' }}>
              <Layers size={13} />
              Target File Scopes
            </div>
            {task.fileScopes.length > 0 ? (
              task.fileScopes.map((f, i) => (
                <div key={i} className="mono" style={{ fontSize: '0.7rem', color: '#D1D5DB' }}>{f}</div>
              ))
            ) : (
              <div style={{ color: '#6B7280' }}>Unrestricted in scope</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
