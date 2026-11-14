import React, { useState } from 'react';
import { Task, Agent, TaskStatus } from '../types';
import {
  ListTodo,
  Plus,
  Search,
  Filter,
  Sparkles,
  GitBranch,
  FileCode,
  CheckCircle2,
  Clock,
  AlertCircle,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface TasksPageProps {
  tasks: Task[];
  agents: Agent[];
  onSelectTask: (task: Task) => void;
  onOpenCreateModal: () => void;
}

export function TasksPage({ tasks, agents, onSelectTask, onOpenCreateModal }: TasksPageProps) {
  const [search, setSearch] = useState('');
  const [scopeFilter, setScopeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.requiredCapabilities.some((c) => c.toLowerCase().includes(search.toLowerCase()));

    const matchesScope = scopeFilter === 'all' || t.requiredScope === scopeFilter;
    const matchesPriority = priorityFilter === 'all' || t.priority === priorityFilter;

    return matchesSearch && matchesScope && matchesPriority;
  });

  const columns: { id: TaskStatus; label: string; color: string }[] = [
    { id: 'backlog', label: 'Backlog', color: '#6B7280' },
    { id: 'ready', label: 'Ready for Agent', color: '#3B82F6' },
    { id: 'in_progress', label: 'In Progress', color: '#06B6D4' },
    { id: 'review', label: 'Review & Verify', color: '#F59E0B' },
    { id: 'done', label: 'Done & Frozen', color: '#10B981' },
    { id: 'blocked', label: 'Blocked', color: '#EF4444' },
  ];

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'critical':
        return <span className="badge badge-red">Critical</span>;
      case 'high':
        return <span className="badge badge-amber">High</span>;
      case 'medium':
        return <span className="badge badge-cyan">Medium</span>;
      default:
        return <span className="badge badge-muted">Low</span>;
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#F3F4F6' }}>Task Coordination Board</h1>
            <span className="badge badge-mint">{tasks.length} tasks registered</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#9CA3AF', marginTop: '0.2rem' }}>
            Permission-checked task transitions, deterministic routing, and structured context versioning.
          </p>
        </div>

        <button onClick={onOpenCreateModal} className="btn btn-primary">
          <Plus size={16} />
          <span>Create Task</span>
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
            placeholder="Search tasks by title, description, or needed capabilities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#6B7280', fontSize: '0.8rem' }}>
            <Filter size={14} />
            <span>Scope:</span>
          </div>
          <select
            className="select"
            style={{ width: 'auto' }}
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value)}
          >
            <option value="all">All Scopes</option>
            <option value="frontend">frontend</option>
            <option value="backend">backend</option>
            <option value="testing">testing</option>
            <option value="security">security</option>
            <option value="docs">docs</option>
          </select>

          <select
            className="select"
            style={{ width: 'auto' }}
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Kanban Board Columns */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1rem',
          alignItems: 'start',
        }}
      >
        {columns.map((col) => {
          const columnTasks = filteredTasks.filter((t) => t.status === col.id);

          return (
            <div
              key={col.id}
              style={{
                background: '#090E17',
                border: '1px solid #1F2937',
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem',
                minHeight: '400px',
              }}
            >
              {/* Column Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.85rem',
                  paddingBottom: '0.5rem',
                  borderBottom: `2px solid ${col.color}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#F3F4F6' }}>{col.label}</span>
                </div>
                <span
                  style={{
                    background: '#1F2937',
                    color: '#E5E7EB',
                    fontSize: '0.725rem',
                    padding: '0.1rem 0.5rem',
                    borderRadius: '9999px',
                    fontWeight: 700,
                  }}
                >
                  {columnTasks.length}
                </span>
              </div>

              {/* Task Cards in Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {columnTasks.map((task) => {
                  const owner = task.ownerAgentId ? agents.find((a) => a.id === task.ownerAgentId) : null;

                  return (
                    <div
                      key={task.id}
                      className="panel"
                      onClick={() => onSelectTask(task)}
                      style={{
                        padding: '0.85rem',
                        cursor: 'pointer',
                        background: '#111827',
                        border: '1px solid #1F2937',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.55rem',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {/* Top Badges */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {getPriorityBadge(task.priority)}
                        <span className="badge badge-muted" style={{ fontSize: '0.675rem' }}>
                          {task.requiredScope}
                        </span>
                      </div>

                      {/* Title */}
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#F3F4F6', lineHeight: 1.3 }}>
                        {task.title}
                      </div>

                      {/* Capabilities */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                        {task.requiredCapabilities.map((cap) => (
                          <span
                            key={cap}
                            style={{
                              background: '#090E17',
                              border: '1px solid #1F2937',
                              color: '#9CA3AF',
                              fontSize: '0.675rem',
                              padding: '0.1rem 0.4rem',
                              borderRadius: '3px',
                            }}
                          >
                            {cap}
                          </span>
                        ))}
                      </div>

                      {/* Latest evidence snippet */}
                      {task.latestEvidenceSummary && (
                        <div
                          style={{
                            background: '#090E17',
                            border: '1px solid #1F2937',
                            borderRadius: '4px',
                            padding: '0.4rem 0.55rem',
                            fontSize: '0.7rem',
                            color: '#9CA3AF',
                          }}
                        >
                          <span style={{ color: '#10B981', fontWeight: 600 }}>EVIDENCE: </span>
                          {task.latestEvidenceSummary.length > 45
                            ? task.latestEvidenceSummary.slice(0, 42) + '...'
                            : task.latestEvidenceSummary}
                        </div>
                      )}

                      {/* Footer: Owner & Context Version */}
                      <div
                        style={{
                          borderTop: '1px solid #1F2937',
                          paddingTop: '0.5rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.725rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          {owner ? (
                            <span style={{ color: '#06B6D4', fontWeight: 600 }}>{owner.displayName}</span>
                          ) : (
                            <span style={{ color: '#F59E0B', fontStyle: 'italic' }}>Unassigned</span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span className="mono badge badge-mint" style={{ fontSize: '0.65rem' }}>
                            v{task.contextVersion}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {columnTasks.length === 0 && (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '2.5rem 1rem',
                      color: '#4B5563',
                      fontSize: '0.75rem',
                      border: '1px dashed #1F2937',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    No tasks in this lane
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
