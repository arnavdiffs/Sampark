import React, { useState, useEffect } from 'react';
import { HealthStatus } from '../types';
import { api } from '../api/client';
import { useToast } from '../components/Toast';
import {
  RotateCcw,
  Play,
  Server,
  Shield,
  Layers,
  Cpu,
  Info,
  CheckCircle2,
  HardDrive,
  Workflow,
  Sparkles,
} from 'lucide-react';

interface SettingsPageProps {
  onRefreshAll: () => void;
  onRunSimulation: () => void;
  isSimulating?: boolean;
}

export function SettingsPage({ onRefreshAll, onRunSimulation, isSimulating }: SettingsPageProps) {
  const { showToast } = useToast();
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    api.getHealth().then(setHealth).catch(console.error);
  }, []);

  const handleResetDemo = async () => {
    if (!confirm('Are you sure you want to reset all data back to original seed state? This restores the initial 5 agents, 5 tasks, and baseline context.')) {
      return;
    }

    setIsResetting(true);
    try {
      const res = await api.resetDemo();
      showToast('success', 'Demo Data Reset', res.message);
      onRefreshAll();
      api.getHealth().then(setHealth);
    } catch (err: any) {
      showToast('error', 'Reset Failed', err.message);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#F3F4F6' }}>
          Control Plane Settings & Architecture
        </h1>
        <p style={{ fontSize: '0.8rem', color: '#9CA3AF', marginTop: '0.2rem' }}>
          Inspect node health, review architectural boundaries, and execute deterministic simulation steps.
        </p>
      </div>

      {/* Top Controls Bar */}
      <div
        className="panel"
        style={{
          padding: '1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          background: '#0D131F',
        }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#F3F4F6' }}>Interactive Hackathon Controls</div>
          <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '0.2rem' }}>
            Drive deterministic cross-agent scenarios or restore the initial test baseline.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={onRunSimulation}
            disabled={isSimulating}
            className="btn btn-cyan"
          >
            <Play size={15} fill={isSimulating ? 'none' : 'currentColor'} />
            <span>{isSimulating ? 'Simulating Step...' : 'Run Simulation Step'}</span>
          </button>

          <button
            onClick={handleResetDemo}
            disabled={isResetting}
            className="btn btn-danger"
          >
            <RotateCcw size={15} />
            <span>{isResetting ? 'Resetting...' : 'Reset Demo Data'}</span>
          </button>
        </div>
      </div>

      {/* Backend Health Card */}
      <div className="panel" style={{ marginBottom: '1.5rem', background: '#090E17' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <Server size={18} color="#10B981" />
          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#F3F4F6' }}>Node Engine Health</span>
        </div>

        {health ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', fontSize: '0.8rem' }}>
            <div style={{ background: '#111827', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid #1F2937' }}>
              <div style={{ color: '#6B7280', fontSize: '0.7rem' }}>SERVICE STATUS</div>
              <div style={{ color: '#10B981', fontWeight: 700, marginTop: '0.2rem' }}>● {health.status.toUpperCase()}</div>
            </div>
            <div style={{ background: '#111827', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid #1F2937' }}>
              <div style={{ color: '#6B7280', fontSize: '0.7rem' }}>BACKEND SERVICE</div>
              <div className="mono" style={{ color: '#F3F4F6', marginTop: '0.2rem' }}>{health.service}</div>
            </div>
            <div style={{ background: '#111827', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid #1F2937' }}>
              <div style={{ color: '#6B7280', fontSize: '0.7rem' }}>RUNTIME MODE</div>
              <div className="mono" style={{ color: '#06B6D4', marginTop: '0.2rem' }}>{health.mode}</div>
            </div>
            <div style={{ background: '#111827', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid #1F2937' }}>
              <div style={{ color: '#6B7280', fontSize: '0.7rem' }}>STORAGE STATS</div>
              <div style={{ color: '#D1D5DB', marginTop: '0.2rem' }}>
                {health.agentsCount} agents • {health.tasksCount} tasks • {health.eventsCount} events
              </div>
            </div>
          </div>
        ) : (
          <div style={{ color: '#6B7280', fontSize: '0.8rem' }}>Pinging backend at http://localhost:8787/api/health...</div>
        )}
      </div>

      {/* Architecture Diagram SVG */}
      <div className="panel" style={{ marginBottom: '1.5rem', background: '#0D131F' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
          <Workflow size={18} color="#06B6D4" />
          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#F3F4F6' }}>
            Cross-Agent Communication Architecture
          </span>
        </div>

        <div style={{ overflowX: 'auto', padding: '1rem', background: '#070B12', borderRadius: 'var(--radius-sm)', border: '1px solid #1F2937' }}>
          <svg viewBox="0 0 880 200" style={{ width: '100%', minWidth: '760px', height: 'auto', display: 'block' }}>
            <defs>
              <marker id="flow-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#10B981" />
              </marker>
              <marker id="flow-arrow-cyan" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#06B6D4" />
              </marker>
            </defs>

            {/* Block 1: Agent Tools */}
            <rect x="20" y="30" width="160" height="140" rx="8" fill="#111827" stroke="#1F2937" strokeWidth="1.5" />
            <text x="100" y="55" fill="#F3F4F6" fontSize="12" fontWeight="bold" textAnchor="middle">
              Coding Agents
            </text>
            <text x="100" y="75" fill="#9CA3AF" fontSize="10" textAnchor="middle">
              Codex, Claude Code
            </text>
            <text x="100" y="90" fill="#9CA3AF" fontSize="10" textAnchor="middle">
              Antigravity, Hermes
            </text>
            <rect x="35" y="115" width="130" height="35" rx="4" fill="#090E17" stroke="#374151" />
            <text x="100" y="136" fill="#10B981" fontSize="10" fontWeight="600" textAnchor="middle">
              Private Chat Transcripts
            </text>

            {/* Arrow 1 to Adapters */}
            <path d="M 180 100 L 235 100" stroke="#06B6D4" strokeWidth="2" markerEnd="url(#flow-arrow-cyan)" />

            {/* Block 2: Sampark Adapters */}
            <rect x="240" y="45" width="160" height="110" rx="8" fill="#0F172A" stroke="#06B6D4" strokeWidth="1.5" />
            <text x="320" y="75" fill="#38BDF8" fontSize="12" fontWeight="bold" textAnchor="middle">
              Sampark Adapters
            </text>
            <text x="320" y="95" fill="#9CA3AF" fontSize="10" textAnchor="middle">
              Explicit Contract Mapping
            </text>
            <text x="320" y="115" fill="#9CA3AF" fontSize="10" textAnchor="middle">
              Untrusted Message Ingest
            </text>
            <text x="320" y="135" fill="#10B981" fontSize="9" textAnchor="middle" className="mono">
              (No raw transcripts)
            </text>

            {/* Arrow 2 to Policy Engine */}
            <path d="M 400 100 L 455 100" stroke="#10B981" strokeWidth="2" markerEnd="url(#flow-arrow)" />

            {/* Block 3: Validation & Policy Engine */}
            <rect x="460" y="30" width="180" height="140" rx="8" fill="#111827" stroke="#10B981" strokeWidth="1.5" />
            <text x="550" y="55" fill="#10B981" fontSize="12" fontWeight="bold" textAnchor="middle">
              Validation & Policy Engine
            </text>
            <text x="550" y="78" fill="#F3F4F6" fontSize="10" textAnchor="middle">
              1. Identity & Active Lease Check
            </text>
            <text x="550" y="96" fill="#F3F4F6" fontSize="10" textAnchor="middle">
              2. Scope Boundary Verification
            </text>
            <text x="550" y="114" fill="#F3F4F6" fontSize="10" textAnchor="middle">
              3. Task Lifecycle Transitions
            </text>
            <text x="550" y="132" fill="#F3F4F6" fontSize="10" textAnchor="middle">
              4. Deterministic Capability Scoring
            </text>
            <text x="550" y="152" fill="#F59E0B" fontSize="9" textAnchor="middle" className="mono">
              Append-Only Audit Log
            </text>

            {/* Arrow 3 to Approved Context */}
            <path d="M 640 100 L 695 100" stroke="#10B981" strokeWidth="2" markerEnd="url(#flow-arrow)" />

            {/* Block 4: Shared Context Layer */}
            <rect x="700" y="45" width="160" height="110" rx="8" fill="#0F172A" stroke="#10B981" strokeWidth="1.5" />
            <text x="780" y="75" fill="#10B981" fontSize="12" fontWeight="bold" textAnchor="middle">
              Shared Project Memory
            </text>
            <text x="780" y="95" fill="#9CA3AF" fontSize="10" textAnchor="middle">
              API Contracts (Frozen)
            </text>
            <text x="780" y="115" fill="#9CA3AF" fontSize="10" textAnchor="middle">
              Test Evidence Artifacts
            </text>
            <text x="780" y="135" fill="#9CA3AF" fontSize="10" textAnchor="middle">
              Compact Version Deltas
            </text>
          </svg>
        </div>
      </div>

      {/* Prototype Boundary & Future Integrations */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div className="panel" style={{ background: '#0D131F' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
            <Shield size={16} color="#F59E0B" />
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#F3F4F6' }}>
              Local-First Prototype Boundaries
            </span>
          </div>
          <ul style={{ fontSize: '0.785rem', color: '#9CA3AF', lineHeight: 1.6, paddingLeft: '1.25rem' }}>
            <li><strong>No Cloud Sync:</strong> Operates entirely on the local machine on port 8787.</li>
            <li><strong>No Vendor Chat Scraping:</strong> Does not violate sandbox boundaries or read private chats.</li>
            <li><strong>Simulated Local Adapters:</strong> All demo agents interact via typed mock adapter interfaces.</li>
            <li><strong>File-Backed Persistence:</strong> State is saved to <code className="mono">data/store.json</code> and <code className="mono">data/events.jsonl</code>. Survives backend restarts.</li>
          </ul>
        </div>

        <div className="panel" style={{ background: '#0D131F' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
            <Sparkles size={16} color="#06B6D4" />
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#F3F4F6' }}>
              Future Integrations
            </span>
          </div>
          <p style={{ fontSize: '0.785rem', color: '#9CA3AF', lineHeight: 1.5, marginBottom: '0.5rem' }}>
            Sampark exchanges explicitly published, structured project context. It does not read another provider's private chat history.
          </p>
          <p style={{ fontSize: '0.785rem', color: '#9CA3AF', lineHeight: 1.5 }}>
            Future production adapters will integrate with official CLI hooks, IDE extension events, and secure local IPC channels with user-approved permissions.
          </p>
        </div>
      </div>
    </div>
  );
}
