import React, { useState } from 'react';
import { X, Bot, Plus } from 'lucide-react';
import { AgentRole, AgentProvider, PermissionScope, AgentAction } from '../types';

interface CreateAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (agentData: any) => Promise<void>;
}

export function CreateAgentModal({ isOpen, onClose, onSubmit }: CreateAgentModalProps) {
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<AgentRole>('Backend Builder');
  const [provider, setProvider] = useState<AgentProvider>('Local Simulator');
  const [powerScore, setPowerScore] = useState<number>(4);
  const [maxConcurrentTasks, setMaxConcurrentTasks] = useState<number>(2);
  const [capabilitiesInput, setCapabilitiesInput] = useState('node, express, api-design');
  const [selectedScopes, setSelectedScopes] = useState<PermissionScope[]>(['backend']);
  const [selectedActions, setSelectedActions] = useState<AgentAction[]>([
    'read_context',
    'publish_context',
    'claim_task',
    'update_task',
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const allScopes: PermissionScope[] = ['frontend', 'backend', 'testing', 'security', 'docs'];
  const allActions: AgentAction[] = [
    'read_context',
    'publish_context',
    'claim_task',
    'handoff_task',
    'update_task',
    'run_tests',
    'review',
  ];

  const toggleScope = (scope: PermissionScope) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? (prev.length > 1 ? prev.filter((s) => s !== scope) : prev) : [...prev, scope]
    );
  };

  const toggleAction = (act: AgentAction) => {
    setSelectedActions((prev) =>
      prev.includes(act) ? (prev.length > 1 ? prev.filter((a) => a !== act) : prev) : [...prev, act]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;

    setIsSubmitting(true);
    try {
      const caps = capabilitiesInput
        .split(',')
        .map((c) => c.trim().toLowerCase())
        .filter(Boolean);

      await onSubmit({
        displayName,
        role,
        provider,
        powerScore,
        maxConcurrentTasks,
        capabilities: caps,
        allowedScopes: selectedScopes,
        allowedActions: selectedActions,
      });
      setDisplayName('');
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
            <div style={{ background: '#06b6d426', padding: '0.4rem', borderRadius: 'var(--radius-sm)' }}>
              <Bot size={20} color="#06B6D4" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F3F4F6' }}>Register Agent Node</h3>
              <p style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                Connect a local or simulated coding agent adapter to the mesh.
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Display Name *</label>
            <input
              type="text"
              required
              className="input"
              placeholder="e.g. Helix"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="select" value={role} onChange={(e) => setRole(e.target.value as AgentRole)}>
                <option value="Coordinator">Coordinator</option>
                <option value="Frontend Builder">Frontend Builder</option>
                <option value="Backend Builder">Backend Builder</option>
                <option value="Test Runner">Test Runner</option>
                <option value="Security Reviewer">Security Reviewer</option>
                <option value="Researcher">Researcher</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Provider (Simulated Adapter)</label>
              <select
                className="select"
                value={provider}
                onChange={(e) => setProvider(e.target.value as AgentProvider)}
              >
                <option value="Local Simulator">Local Simulator</option>
                <option value="Antigravity">Antigravity (Simulated)</option>
                <option value="Codex">Codex (Simulated)</option>
                <option value="Claude Code">Claude Code (Simulated)</option>
                <option value="Hermes">Hermes (Simulated)</option>
                <option value="ZCode">ZCode (Simulated)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Power Score (1 to 5)</label>
              <input
                type="number"
                min={1}
                max={5}
                className="input"
                value={powerScore}
                onChange={(e) => setPowerScore(Number(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Max Concurrent Tasks</label>
              <input
                type="number"
                min={1}
                max={10}
                className="input"
                value={maxConcurrentTasks}
                onChange={(e) => setMaxConcurrentTasks(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Capabilities (comma separated)</label>
            <input
              type="text"
              className="input"
              value={capabilitiesInput}
              onChange={(e) => setCapabilitiesInput(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Permitted Scopes</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {allScopes.map((scope) => {
                const active = selectedScopes.includes(scope);
                return (
                  <button
                    key={scope}
                    type="button"
                    onClick={() => toggleScope(scope)}
                    style={{
                      padding: '0.3rem 0.65rem',
                      borderRadius: 'var(--radius-sm)',
                      border: `1px solid ${active ? '#10B981' : '#374151'}`,
                      background: active ? '#10b98122' : '#1F2937',
                      color: active ? '#10B981' : '#9CA3AF',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                    }}
                  >
                    {scope}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Allowed Mesh Actions</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {allActions.map((act) => {
                const active = selectedActions.includes(act);
                return (
                  <button
                    key={act}
                    type="button"
                    onClick={() => toggleAction(act)}
                    style={{
                      padding: '0.3rem 0.65rem',
                      borderRadius: 'var(--radius-sm)',
                      border: `1px solid ${active ? '#06B6D4' : '#374151'}`,
                      background: active ? '#06b6d422' : '#1F2937',
                      color: active ? '#06B6D4' : '#9CA3AF',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                    }}
                  >
                    {act}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            style={{
              padding: '0.65rem 0.85rem',
              background: '#090E17',
              border: '1px solid #1F2937',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.725rem',
              color: '#9CA3AF',
              marginBottom: '1rem',
            }}
          >
            ℹ️ <strong>Demo Policy Engine:</strong> Generates dynamic <code className="mono">agt_</code> and <code className="mono">sess_</code> tokens with 12h lease expiry. No secret keys stored.
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary">
              <Plus size={16} />
              <span>{isSubmitting ? 'Registering...' : 'Register Agent'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
