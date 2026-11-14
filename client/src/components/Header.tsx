import React, { useState, useEffect } from 'react';
import { Play, Plus, Server, Clock } from 'lucide-react';

interface HeaderProps {
  onRunSimulation: () => void;
  onCreateTask: () => void;
  isSimulating?: boolean;
}

export function Header({ onRunSimulation, onCreateTask, isSimulating }: HeaderProps) {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="top-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="badge badge-mint" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.25rem 0.65rem' }}>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: '#10B981',
                boxShadow: '0 0 8px #10B981',
              }}
            />
            Local Mesh Online
          </span>
          <span style={{ fontSize: '0.8rem', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Server size={13} />
            localhost:8787
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.785rem', color: '#9CA3AF', marginRight: '0.5rem' }}>
          <Clock size={13} color="#6B7280" />
          <span className="mono">{time}</span>
        </div>

        <button
          onClick={onRunSimulation}
          disabled={isSimulating}
          className="btn btn-cyan btn-sm"
          title="Executes one deterministic cross-agent action (contract publish, routing, test result, blocked cross-scope)"
        >
          <Play size={14} fill={isSimulating ? 'none' : 'currentColor'} />
          <span>{isSimulating ? 'Simulating...' : 'Run Simulation Step'}</span>
        </button>

        <button onClick={onCreateTask} className="btn btn-primary btn-sm">
          <Plus size={15} />
          <span>Create Task</span>
        </button>
      </div>
    </header>
  );
}
