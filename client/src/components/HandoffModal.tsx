import React, { useState } from 'react';
import { X, ArrowRightLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Agent, Task } from '../types';

interface HandoffModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
  agents: Agent[];
  onSubmit: (recipientAgentId: string, handoffNote: string) => Promise<void>;
}

export function HandoffModal({ isOpen, onClose, task, agents, onSubmit }: HandoffModalProps) {
  const [recipientId, setRecipientId] = useState<string>('');
  const [handoffNote, setHandoffNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Filter candidates and determine eligibility
  const candidates = agents.map((agent) => {
    const isCurrentOwner = agent.id === task.ownerAgentId;
    const matchesScope = agent.allowedScopes.includes(task.requiredScope);
    const hasCapabilities = task.requiredCapabilities.every((c) => agent.capabilities.includes(c));
    const hasCapacity = agent.currentTaskCount < agent.maxConcurrentTasks;
    const isOnline = agent.status !== 'offline';
    const isRevoked = agent.revoked;

    const isEligible = !isCurrentOwner && matchesScope && hasCapabilities && hasCapacity && isOnline && !isRevoked;

    let ineligibilityReason = '';
    if (isCurrentOwner) ineligibilityReason = 'Already current task owner';
    else if (isRevoked) ineligibilityReason = 'Agent revoked';
    else if (!isOnline) ineligibilityReason = 'Agent is offline';
    else if (!matchesScope) ineligibilityReason = `Lacks required scope '${task.requiredScope}'`;
    else if (!hasCapabilities) ineligibilityReason = `Missing required capabilities`;
    else if (!hasCapacity) ineligibilityReason = `At max capacity (${agent.currentTaskCount}/${agent.maxConcurrentTasks})`;

    return {
      agent,
      isEligible,
      ineligibilityReason,
    };
  });

  const selectedCandidate = candidates.find((c) => c.agent.id === recipientId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientId || !handoffNote.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(recipientId, handoffNote.trim());
      setHandoffNote('');
      setRecipientId('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ background: '#3b82f626', padding: '0.4rem', borderRadius: 'var(--radius-sm)' }}>
              <ArrowRightLeft size={20} color="#3B82F6" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F3F4F6' }}>Permission-Checked Handoff</h3>
              <p style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                Transfer ownership of "{task.title.slice(0, 32)}..." with verified scope and capacity checks.
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Select Recipient Agent *</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '200px', overflowY: 'auto' }}>
              {candidates.map(({ agent, isEligible, ineligibilityReason }) => (
                <div
                  key={agent.id}
                  onClick={() => setRecipientId(agent.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.6rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    border: `1px solid ${recipientId === agent.id ? (isEligible ? '#10B981' : '#EF4444') : '#1F2937'}`,
                    background: recipientId === agent.id ? '#152033' : '#090E17',
                    cursor: 'pointer',
                    opacity: isEligible ? 1 : 0.7,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: isEligible ? '#10B981' : '#EF4444' }} />
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#F3F4F6' }}>
                        {agent.displayName} <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>({agent.role})</span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#6B7280' }}>
                        Scopes: [{agent.allowedScopes.join(', ')}] • Power: {agent.powerScore}/5 • Tasks: {agent.currentTaskCount}/{agent.maxConcurrentTasks}
                      </div>
                    </div>
                  </div>

                  <div>
                    {isEligible ? (
                      <span className="badge badge-mint" style={{ fontSize: '0.7rem' }}>
                        <CheckCircle2 size={12} /> Eligible
                      </span>
                    ) : (
                      <span className="badge badge-red" style={{ fontSize: '0.675rem' }} title={ineligibilityReason}>
                        <AlertCircle size={12} /> {ineligibilityReason}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedCandidate && !selectedCandidate.isEligible && (
            <div
              style={{
                padding: '0.65rem 0.85rem',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid #EF4444',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.775rem',
                color: '#EF4444',
                marginBottom: '1rem',
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'center',
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>
                <strong>Warning:</strong> {selectedCandidate.agent.displayName} is ineligible ({selectedCandidate.ineligibilityReason}). Submitting will be rejected by policy engine.
              </span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Structured Handoff Note * (min 5 chars)</label>
            <textarea
              required
              className="textarea"
              rows={3}
              placeholder="e.g. Completed initial scaffolding; passing to test runner with auth fixture ready."
              value={handoffNote}
              onChange={(e) => setHandoffNote(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !recipientId || !handoffNote.trim()}
              className="btn btn-primary"
            >
              <ArrowRightLeft size={16} />
              <span>{isSubmitting ? 'Transferring...' : 'Execute Handoff'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
