import React, { useState, useEffect } from 'react';
import { Task, Agent, ContextEntry, ContextKind, PermissionScope, CompactContextResponse } from '../types';
import { api } from '../api/client';
import { useToast } from '../components/Toast';
import {
  FileCode2,
  Send,
  Zap,
  CheckCircle2,
  FileCheck,
  AlertTriangle,
  ArrowRightLeft,
  ShieldAlert,
  GitCommit,
  Layers,
  Database,
  Terminal,
} from 'lucide-react';

interface SharedContextPageProps {
  tasks: Task[];
  agents: Agent[];
  initialTaskId?: string | null;
  onTaskUpdated: () => void;
}

export function SharedContextPage({ tasks, agents, initialTaskId, onTaskUpdated }: SharedContextPageProps) {
  const { showToast } = useToast();
  const [selectedTaskId, setSelectedTaskId] = useState<string>(initialTaskId || tasks[0]?.id || '');
  const [contextEntries, setContextEntries] = useState<ContextEntry[]>([]);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);

  // Delta Retrieval Widget state
  const [sinceVersionInput, setSinceVersionInput] = useState<string>('0');
  const [compactDelta, setCompactDelta] = useState<CompactContextResponse | null>(null);
  const [isFetchingDelta, setIsFetchingDelta] = useState(false);

  // Publish Form State
  const [sourceAgentId, setSourceAgentId] = useState<string>(agents[0]?.id || '');
  const [entryKind, setEntryKind] = useState<ContextKind>('api_contract');
  const [entryTitle, setEntryTitle] = useState('');
  const [entrySummary, setEntrySummary] = useState('');
  const [entryScope, setEntryScope] = useState<PermissionScope>('backend');
  const [jsonInput, setJsonInput] = useState(`{\n  "endpoint": "/api/users",\n  "method": "GET",\n  "response": {\n    "status": 200,\n    "users": []\n  }\n}`);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId);

  // Load entries when selected task changes
  useEffect(() => {
    if (!selectedTaskId) return;
    setIsLoadingEntries(true);
    api
      .getTaskContext(selectedTaskId)
      .then((res) => {
        setContextEntries(res.deltaEntries);
      })
      .catch((err) => {
        console.error('Failed to load context entries:', err);
      })
      .finally(() => {
        setIsLoadingEntries(false);
      });
  }, [selectedTaskId]);

  const handleFetchDelta = async () => {
    if (!selectedTaskId) return;
    setIsFetchingDelta(true);
    try {
      const v = sinceVersionInput.trim() === '' ? undefined : Number(sinceVersionInput);
      const res = await api.getTaskContext(selectedTaskId, v);
      setCompactDelta(res);
      showToast('success', 'Compact Context Delta Received', `${res.deltaEntries.length} new entries (${res.estimatedBytes} bytes)`);
    } catch (err: any) {
      showToast('error', 'Delta Fetch Failed', err.message);
    } finally {
      setIsFetchingDelta(false);
    }
  };

  const handlePublishSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setJsonError(null);

    // Validate JSON
    let parsedValue: Record<string, any>;
    try {
      parsedValue = JSON.parse(jsonInput);
      if (typeof parsedValue !== 'object' || Array.isArray(parsedValue) || parsedValue === null) {
        throw new Error('Root JSON value must be an object (key-value pairs)');
      }
    } catch (err: any) {
      setJsonError(`JSON Syntax Error: ${err.message}`);
      showToast('error', 'Invalid JSON Payload', err.message);
      return;
    }

    setIsPublishing(true);
    try {
      const res = await api.publishContext(selectedTaskId, {
        kind: entryKind,
        title: entryTitle,
        summary: entrySummary,
        structuredValue: parsedValue,
        sourceAgentId,
        visibilityScope: entryScope,
        tags: [entryKind, entryScope],
      });

      showToast('success', 'Context Version Committed', `Successfully published version ${res.task.contextVersion}`);
      setEntryTitle('');
      setEntrySummary('');
      // Reload entries
      const updated = await api.getTaskContext(selectedTaskId);
      setContextEntries(updated.deltaEntries);
      onTaskUpdated();
    } catch (err: any) {
      showToast('error', 'Publish Rejected', err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  const getKindBadge = (kind: ContextKind) => {
    switch (kind) {
      case 'api_contract':
        return <span className="badge badge-cyan"><Database size={11} /> API Contract</span>;
      case 'test_result':
        return <span className="badge badge-mint"><CheckCircle2 size={11} /> Test Evidence</span>;
      case 'file_change':
        return <span className="badge badge-muted"><FileCheck size={11} /> File Change</span>;
      case 'decision':
        return <span className="badge badge-mint"><GitCommit size={11} /> Decision</span>;
      case 'risk':
        return <span className="badge badge-red"><AlertTriangle size={11} /> Risk / Vulnerability</span>;
      case 'handoff_note':
        return <span className="badge badge-amber"><ArrowRightLeft size={11} /> Handoff Note</span>;
      default:
        return <span className="badge badge-muted">{kind}</span>;
    }
  };

  return (
    <div className="page-container">
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#F3F4F6' }}>Shared Project Memory</h1>
            <span className="badge badge-mint">Versioned Deltas</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#9CA3AF', marginTop: '0.2rem' }}>
            Context is typed project memory — not an unbounded transcript. Small, structured, permission-checked updates.
          </p>
        </div>

        {/* Task Selector Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>Active Task:</span>
          <select
            className="select"
            style={{ width: 'auto', minWidth: '260px' }}
            value={selectedTaskId}
            onChange={(e) => {
              setSelectedTaskId(e.target.value);
              setCompactDelta(null);
            }}
          >
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title} (v{t.contextVersion}) [{t.requiredScope}]
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Two Column Layout: Left Context Timeline / Right: Delta Widget & Publish Form */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }}>
        {/* Left Column: Versioned Context Timeline */}
        <div className="panel" style={{ minHeight: '600px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileCode2 size={18} color="#10B981" />
                <span style={{ fontWeight: 700, fontSize: '1rem', color: '#F3F4F6' }}>Context Version Timeline</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '0.2rem' }}>
                Task: <strong style={{ color: '#F3F4F6' }}>{selectedTask?.title}</strong> • Current Version:{' '}
                <span className="badge badge-mint" style={{ fontSize: '0.7rem' }}>
                  v{selectedTask?.contextVersion}
                </span>
              </div>
            </div>
          </div>

          {isLoadingEntries ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#6B7280' }}>Loading context timeline...</div>
          ) : contextEntries.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {contextEntries.map((entry) => {
                const author = agents.find((a) => a.id === entry.sourceAgentId);

                return (
                  <div
                    key={entry.id}
                    style={{
                      background: '#090E17',
                      border: '1px solid #1F2937',
                      borderRadius: 'var(--radius-sm)',
                      padding: '1rem',
                      position: 'relative',
                    }}
                  >
                    {/* Entry Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.35rem' }}>
                          <span className="badge badge-mint" style={{ fontSize: '0.7rem', fontWeight: 700 }}>
                            v{entry.version}
                          </span>
                          {getKindBadge(entry.kind)}
                          <span className="badge badge-muted" style={{ fontSize: '0.675rem' }}>
                            {entry.visibilityScope}
                          </span>
                        </div>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#F3F4F6' }}>{entry.title}</h4>
                      </div>

                      <div style={{ textAlign: 'right', fontSize: '0.7rem', color: '#6B7280' }}>
                        <div>{new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        <div style={{ color: '#06B6D4' }}>{author ? author.displayName : entry.sourceAgentId}</div>
                      </div>
                    </div>

                    {/* Summary */}
                    <p style={{ fontSize: '0.8rem', color: '#9CA3AF', marginBottom: '0.75rem', lineHeight: 1.4 }}>
                      {entry.summary}
                    </p>

                    {/* Structured JSON Value Inspector */}
                    <div
                      style={{
                        background: '#040810',
                        border: '1px solid #1a2233',
                        borderRadius: '4px',
                        padding: '0.65rem',
                      }}
                    >
                      <div style={{ fontSize: '0.675rem', color: '#6B7280', marginBottom: '0.25rem', fontWeight: 600 }}>
                        STRUCTURED PAYLOAD (READ-ONLY MEMORY):
                      </div>
                      <pre
                        className="mono"
                        style={{
                          fontSize: '0.725rem',
                          color: '#38BDF8',
                          maxHeight: '160px',
                          overflowY: 'auto',
                          lineHeight: 1.35,
                        }}
                      >
                        {JSON.stringify(entry.structuredValue, null, 2)}
                      </pre>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#6B7280' }}>
              No context entries published for this task yet.
            </div>
          )}
        </div>

        {/* Right Column: Compact Delta Widget & Publish Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* 1. Request Compact Context Widget */}
          <div className="panel" style={{ background: '#0D131F', borderColor: '#1E293B' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.4rem' }}>
              <Zap size={18} color="#06B6D4" />
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#F3F4F6' }}>Request Compact Context Delta</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#9CA3AF', marginBottom: '0.85rem' }}>
              Retrieves only project memory newer than <code className="mono">sinceVersion</code>. Never exposes unbounded chat history.
            </p>

            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginBottom: '0.85rem' }}>
              <div style={{ flex: 1 }}>
                <label className="form-label" style={{ fontSize: '0.725rem' }}>
                  Known Context Version (sinceVersion)
                </label>
                <input
                  type="number"
                  min={0}
                  className="input"
                  placeholder="e.g. 0, 1, 2"
                  value={sinceVersionInput}
                  onChange={(e) => setSinceVersionInput(e.target.value)}
                />
              </div>

              <div style={{ alignSelf: 'flex-end' }}>
                <button
                  type="button"
                  onClick={handleFetchDelta}
                  disabled={isFetchingDelta}
                  className="btn btn-cyan"
                  style={{ height: '38px' }}
                >
                  <Zap size={15} />
                  <span>{isFetchingDelta ? 'Fetching...' : 'Retrieve Delta'}</span>
                </button>
              </div>
            </div>

            {/* Delta Response Display */}
            {compactDelta && (
              <div
                style={{
                  background: '#090E17',
                  border: '1px solid #1F2937',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.85rem',
                  fontSize: '0.775rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', borderBottom: '1px solid #1F2937', paddingBottom: '0.4rem' }}>
                  <span style={{ color: '#10B981', fontWeight: 600 }}>✓ Compact Delta Received</span>
                  <span className="mono" style={{ color: '#06B6D4' }}>
                    {compactDelta.estimatedBytes} bytes • {compactDelta.deltaEntries.length} new entries
                  </span>
                </div>

                <div style={{ marginBottom: '0.5rem' }}>
                  <div style={{ color: '#6B7280', fontSize: '0.7rem' }}>COMPACT BRIEF:</div>
                  <div style={{ color: '#F3F4F6', lineHeight: 1.4 }}>{compactDelta.compactBrief}</div>
                </div>

                {compactDelta.dependencySummary.length > 0 && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <div style={{ color: '#6B7280', fontSize: '0.7rem' }}>LINKED DEPENDENCIES:</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.2rem' }}>
                      {compactDelta.dependencySummary.map((d) => (
                        <span key={d.id} className="badge badge-muted" style={{ fontSize: '0.675rem' }}>
                          {d.title} ({d.status})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. Publish Context Entry Form */}
          <div className="panel" style={{ background: '#0D131F' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.4rem' }}>
              <Send size={18} color="#10B981" />
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#F3F4F6' }}>Publish Context Entry</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#9CA3AF', marginBottom: '1rem' }}>
              Commit structured contracts, test evidence, or decisions into shared memory. Strict scope validation enforced.
            </p>

            <form onSubmit={handlePublishSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Source Agent *</label>
                  <select
                    className="select"
                    value={sourceAgentId}
                    onChange={(e) => setSourceAgentId(e.target.value)}
                  >
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.displayName} ({a.role}) [{a.allowedScopes.join(', ')}]
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Entry Kind *</label>
                  <select
                    className="select"
                    value={entryKind}
                    onChange={(e) => setEntryKind(e.target.value as ContextKind)}
                  >
                    <option value="api_contract">API Contract</option>
                    <option value="test_result">Test Result</option>
                    <option value="file_change">File Change</option>
                    <option value="decision">Decision</option>
                    <option value="risk">Risk / Vulnerability</option>
                    <option value="handoff_note">Handoff Note</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Title *</label>
                  <input
                    type="text"
                    required
                    className="input"
                    placeholder="e.g. Login Contract v3"
                    value={entryTitle}
                    onChange={(e) => setEntryTitle(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Visibility Scope *</label>
                  <select
                    className="select"
                    value={entryScope}
                    onChange={(e) => setEntryScope(e.target.value as PermissionScope)}
                  >
                    <option value="backend">backend</option>
                    <option value="frontend">frontend</option>
                    <option value="testing">testing</option>
                    <option value="security">security</option>
                    <option value="docs">docs</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Human-Readable Summary * (min 5 chars)</label>
                <input
                  type="text"
                  required
                  className="input"
                  placeholder="e.g. Frozen POST /api/login contract with rate limit headers"
                  value={entrySummary}
                  onChange={(e) => setEntrySummary(e.target.value)}
                />
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>
                    Structured Value (JSON object) *
                  </label>
                  {jsonError && <span style={{ color: '#EF4444', fontSize: '0.7rem' }}>Invalid JSON</span>}
                </div>
                <textarea
                  required
                  className="textarea mono"
                  rows={5}
                  style={{ fontSize: '0.75rem', color: '#38BDF8' }}
                  value={jsonInput}
                  onChange={(e) => {
                    setJsonInput(e.target.value);
                    setJsonError(null);
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button
                  type="submit"
                  disabled={isPublishing || !entryTitle.trim() || !entrySummary.trim()}
                  className="btn btn-primary"
                >
                  <Send size={15} />
                  <span>{isPublishing ? 'Publishing...' : 'Publish Context Entry'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
