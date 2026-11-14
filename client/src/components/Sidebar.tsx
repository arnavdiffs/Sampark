import React from 'react';
import {
  LayoutDashboard,
  Bot,
  ListTodo,
  FileCode2,
  ScrollText,
  Sliders,
  ShieldCheck,
  Activity,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  agentsCount?: number;
  tasksCount?: number;
}

export function Sidebar({ currentTab, onTabChange, agentsCount = 5, tasksCount = 5 }: SidebarProps) {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'agents', label: 'Agents', icon: Bot, badge: agentsCount },
    { id: 'tasks', label: 'Tasks', icon: ListTodo, badge: tasksCount },
    { id: 'context', label: 'Shared Context', icon: FileCode2 },
    { id: 'audit', label: 'Audit Trail', icon: ScrollText },
    { id: 'settings', label: 'Settings & Demo', icon: Sliders },
  ];

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--panel-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #10B981 0%, #06B6D4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 12px rgba(16, 185, 129, 0.35)',
            }}
          >
            <ShieldCheck size={20} color="#042f2e" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.125rem', letterSpacing: '-0.02em', color: '#F3F4F6' }}>
              Sampark
            </div>
            <div style={{ fontSize: '0.685rem', color: '#10B981', fontWeight: 600 }}>CONTROL PLANE</div>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav style={{ padding: '1rem 0.75rem', flex: 1 }}>
        <div style={{ fontSize: '0.7rem', color: '#6B7280', textTransform: 'uppercase', padding: '0 0.75rem 0.5rem', fontWeight: 700, letterSpacing: '0.05em' }}>
          Mesh Operations
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: active ? '#152033' : 'transparent',
                  color: active ? '#10B981' : '#9CA3AF',
                  fontSize: '0.85rem',
                  fontWeight: active ? 600 : 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  transition: 'all 0.15s ease',
                  borderLeft: active ? '3px solid #10B981' : '3px solid transparent',
                }}
              >
                <Icon size={18} color={active ? '#10B981' : '#9CA3AF'} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge !== undefined && (
                  <span
                    style={{
                      background: active ? '#10b98126' : '#1F2937',
                      color: active ? '#10B981' : '#6B7280',
                      fontSize: '0.7rem',
                      padding: '0.1rem 0.45rem',
                      borderRadius: '9999px',
                      fontWeight: 600,
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Footer Info Box */}
      <div style={{ padding: '1rem', borderTop: '1px solid var(--panel-border)' }}>
        <div
          style={{
            background: '#090E17',
            border: '1px solid var(--panel-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#10B981', fontWeight: 600 }}>
            <Activity size={12} className="pulse-icon" />
            <span>Local Mesh Active</span>
          </div>
          <div style={{ fontSize: '0.7rem', color: '#6B7280', marginTop: '0.25rem', lineHeight: 1.3 }}>
            Port 8787 • File Store • Untrusted Messages Policy
          </div>
        </div>
      </div>
    </aside>
  );
}
