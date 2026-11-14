import React, { useState } from 'react';
import { Agent, Task } from '../types';
import { Bot, CheckCircle2, Clock, ShieldAlert, Cpu } from 'lucide-react';

interface MeshGraphProps {
  agents: Agent[];
  tasks: Task[];
  onSelectAgent: (agent: Agent) => void;
  onSelectTask: (task: Task) => void;
}

export function MeshGraph({ agents, tasks, onSelectAgent, onSelectTask }: MeshGraphProps) {
  const [selectedNode, setSelectedNode] = useState<{ type: 'agent' | 'task'; data: any } | null>(null);

  // Layout coordinates for SVG
  const width = 840;
  const height = 360;

  // Agent nodes position on left column
  const agentPositions = agents.map((agent, i) => {
    const spacing = height / (agents.length + 1);
    return {
      agent,
      x: 130,
      y: (i + 1) * spacing,
    };
  });

  // Task nodes position on right column
  const taskPositions = tasks.slice(0, 5).map((task, i) => {
    const spacing = height / (Math.min(tasks.length, 5) + 1);
    return {
      task,
      x: 640,
      y: (i + 1) * spacing,
    };
  });

  const handleAgentClick = (agent: Agent) => {
    setSelectedNode({ type: 'agent', data: agent });
    onSelectAgent(agent);
  };

  const handleTaskClick = (task: Task) => {
    setSelectedNode({ type: 'task', data: task });
    onSelectTask(task);
  };

  return (
    <div className="panel mesh-card" style={{ padding: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Cpu size={16} color="#10B981" />
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#F3F4F6' }}>Agent Mesh Topology</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '0.2rem' }}>
            Live permission boundaries, task assignments, and blocked cross-scope flow paths.
          </p>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '0.85rem', fontSize: '0.725rem', color: '#9CA3AF' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: 10, height: 2, background: '#10B981', display: 'inline-block' }} />
            <span>Active Assignment</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: 10, height: 2, background: '#EF4444', borderTop: '2px dashed #EF4444', display: 'inline-block' }} />
            <span>Scope Blocked</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: 10, height: 2, background: '#6B7280', borderTop: '2px dashed #6B7280', display: 'inline-block' }} />
            <span>Unassigned / Ready</span>
          </div>
        </div>
      </div>

      <div style={{ position: 'relative', overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', minWidth: '700px', display: 'block' }}>
          <defs>
            {/* Markers */}
            <marker id="arrow-active" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#10B981" />
            </marker>
            <marker id="arrow-rejected" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#EF4444" />
            </marker>
            <marker id="arrow-idle" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#4B5563" />
            </marker>
            <linearGradient id="link-grad-active" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.8" />
            </linearGradient>
          </defs>

          {/* Render Connections */}
          {taskPositions.map(({ task, x: tx, y: ty }) => {
            if (!task.ownerAgentId) return null;
            const agPos = agentPositions.find((a) => a.agent.id === task.ownerAgentId);
            if (!agPos) return null;

            const isDone = task.status === 'done';
            const strokeColor = isDone ? '#10B981' : '#06B6D4';

            // Curved cubic bezier
            const pathData = `M ${agPos.x + 30} ${agPos.y} C ${agPos.x + 220} ${agPos.y}, ${tx - 220} ${ty}, ${tx - 25} ${ty}`;

            return (
              <g key={`link-${task.id}`}>
                <path
                  d={pathData}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth="2.5"
                  strokeOpacity="0.75"
                  markerEnd="url(#arrow-active)"
                />
              </g>
            );
          })}

          {/* Blocked Connection Demo: Nova trying to claim/publish to Backend Contract */}
          {(() => {
            const novaPos = agentPositions.find((a) => a.agent.displayName === 'Nova');
            const contractPos = taskPositions.find((t) => t.task.title.includes('API contract'));
            if (novaPos && contractPos) {
              const pathData = `M ${novaPos.x + 30} ${novaPos.y} C ${novaPos.x + 180} ${novaPos.y + 60}, ${contractPos.x - 180} ${contractPos.y - 60}, ${contractPos.x - 25} ${contractPos.y}`;
              return (
                <g key="blocked-nova-contract">
                  <path
                    d={pathData}
                    fill="none"
                    stroke="#EF4444"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                    strokeOpacity="0.85"
                    markerEnd="url(#arrow-rejected)"
                  />
                  {/* Warning icon at mid-curve */}
                  <circle cx={(novaPos.x + contractPos.x) / 2} cy={(novaPos.y + contractPos.y) / 2} r="10" fill="#1F2937" stroke="#EF4444" strokeWidth="1.5" />
                  <text
                    x={(novaPos.x + contractPos.x) / 2}
                    y={(novaPos.y + contractPos.y) / 2 + 4}
                    fill="#EF4444"
                    fontSize="11"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    !
                  </text>
                </g>
              );
            }
            return null;
          })()}

          {/* Render Agent Nodes */}
          {agentPositions.map(({ agent, x, y }) => {
            const isSelected = selectedNode?.data?.id === agent.id;
            const statusColor =
              agent.status === 'online'
                ? '#10B981'
                : agent.status === 'busy'
                ? '#06B6D4'
                : agent.status === 'idle'
                ? '#F59E0B'
                : '#6B7280';

            return (
              <g
                key={agent.id}
                transform={`translate(${x}, ${y})`}
                onClick={() => handleAgentClick(agent)}
                style={{ cursor: 'pointer' }}
              >
                {/* Outer ring */}
                <circle
                  r="24"
                  fill="#0D131F"
                  stroke={isSelected ? '#10B981' : '#1F2937'}
                  strokeWidth={isSelected ? 3 : 1.5}
                />
                {/* Status Dot */}
                <circle cx="16" cy="-16" r="5" fill={statusColor} stroke="#080C14" strokeWidth="2" />

                {/* Inner Icon */}
                <foreignObject x="-12" y="-12" width="24" height="24">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <Bot size={16} color={isSelected ? '#10B981' : '#9CA3AF'} />
                  </div>
                </foreignObject>

                {/* Labels */}
                <text x="-35" y="4" textAnchor="end" fill="#F3F4F6" fontSize="12" fontWeight="600">
                  {agent.displayName}
                </text>
                <text x="-35" y="18" textAnchor="end" fill="#6B7280" fontSize="10">
                  {agent.role}
                </text>
                <text x="-35" y="30" textAnchor="end" fill="#10B981" fontSize="9" className="mono">
                  pwr {agent.powerScore}/5 • {agent.currentTaskCount}/{agent.maxConcurrentTasks}
                </text>
              </g>
            );
          })}

          {/* Render Task Nodes */}
          {taskPositions.map(({ task, x, y }) => {
            const isSelected = selectedNode?.data?.id === task.id;
            const isDone = task.status === 'done';
            const isInProgress = task.status === 'in_progress';
            const statusBorder = isDone ? '#10B981' : isInProgress ? '#06B6D4' : '#374151';

            return (
              <g
                key={task.id}
                transform={`translate(${x}, ${y})`}
                onClick={() => handleTaskClick(task)}
                style={{ cursor: 'pointer' }}
              >
                {/* Node Box */}
                <rect
                  x="-20"
                  y="-18"
                  width="180"
                  height="36"
                  rx="6"
                  fill="#0D131F"
                  stroke={isSelected ? '#10B981' : statusBorder}
                  strokeWidth={isSelected ? 2.5 : 1.2}
                />

                {/* Status Indicator Icon */}
                <foreignObject x="-14" y="-8" width="16" height="16">
                  {isDone ? (
                    <CheckCircle2 size={15} color="#10B981" />
                  ) : isInProgress ? (
                    <Clock size={15} color="#06B6D4" />
                  ) : (
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6B7280', margin: '4px' }} />
                  )}
                </foreignObject>

                {/* Task Title truncated */}
                <text x="8" y="0" fill="#E5E7EB" fontSize="11" fontWeight="600">
                  {task.title.length > 22 ? task.title.slice(0, 20) + '...' : task.title}
                </text>

                {/* Scope & Version info */}
                <text x="8" y="12" fill="#9CA3AF" fontSize="9" className="mono">
                  [{task.requiredScope}] • v{task.contextVersion}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected Node Quick Inspector Bar */}
      {selectedNode && (
        <div
          style={{
            marginTop: '0.75rem',
            padding: '0.75rem 1rem',
            background: '#0D131F',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid #1F2937',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.8rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="badge badge-mint">
              {selectedNode.type === 'agent' ? 'Agent Node Selected' : 'Task Node Selected'}
            </span>
            <span style={{ fontWeight: 600, color: '#F3F4F6' }}>
              {selectedNode.type === 'agent' ? selectedNode.data.displayName : selectedNode.data.title}
            </span>
            <span style={{ color: '#9CA3AF' }}>
              {selectedNode.type === 'agent'
                ? `Role: ${selectedNode.data.role} | Provider: ${selectedNode.data.provider} | Scopes: [${selectedNode.data.allowedScopes.join(', ')}]`
                : `Status: ${selectedNode.data.status} | Scope: ${selectedNode.data.requiredScope} | Context: v${selectedNode.data.contextVersion}`}
            </span>
          </div>
          <button
            onClick={() =>
              selectedNode.type === 'agent' ? onSelectAgent(selectedNode.data) : onSelectTask(selectedNode.data)
            }
            className="btn btn-secondary btn-sm"
          >
            Open Inspector Drawer →
          </button>
        </div>
      )}
    </div>
  );
}
