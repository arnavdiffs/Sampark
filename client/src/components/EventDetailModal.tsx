import React from 'react';
import { X, CheckCircle2, AlertTriangle, ScrollText, Copy } from 'lucide-react';
import { AuditEvent } from '../types';
import { useToast } from './Toast';

interface EventDetailModalProps {
  event: AuditEvent | null;
  onClose: () => void;
}

export function EventDetailModal({ event, onClose }: EventDetailModalProps) {
  const { showToast } = useToast();

  if (!event) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(event, null, 2));
    showToast('info', 'Event JSON Copied', `Event ${event.id}`);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '720px' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                background: event.accepted ? '#10b98126' : '#ef444426',
                padding: '0.45rem',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              {event.accepted ? <CheckCircle2 size={22} color="#10B981" /> : <AlertTriangle size={22} color="#EF4444" />}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F3F4F6' }}>{event.eventType}</h3>
                <span className={`badge ${event.accepted ? 'badge-mint' : 'badge-red'}`}>
                  {event.accepted ? 'ACCEPTED' : 'VALIDATION REJECTED'}
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '0.15rem' }}>
                Correlation ID: <span className="mono">{event.correlationId}</span> • {new Date(event.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Reason banner */}
        <div
          style={{
            padding: '0.85rem 1rem',
            background: event.accepted ? '#0d1820' : 'rgba(239, 68, 68, 0.12)',
            border: `1px solid ${event.accepted ? '#164e63' : '#ef444455'}`,
            borderRadius: 'var(--radius-sm)',
            marginBottom: '1rem',
          }}
        >
          <div style={{ fontSize: '0.725rem', color: event.accepted ? '#06B6D4' : '#EF4444', fontWeight: 700, marginBottom: '0.2rem' }}>
            POLICY ENGINE EVALUATION REASON:
          </div>
          <div style={{ fontSize: '0.85rem', color: '#F3F4F6', lineHeight: 1.4 }}>{event.reason}</div>
        </div>

        {/* Metadata Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem', fontSize: '0.75rem' }}>
          <div className="panel" style={{ padding: '0.65rem 0.85rem', background: '#090E17' }}>
            <div style={{ color: '#6B7280' }}>Actor Agent</div>
            <div className="mono" style={{ color: '#F3F4F6', fontWeight: 600, marginTop: '0.15rem' }}>
              {event.actorAgentId}
            </div>
          </div>

          <div className="panel" style={{ padding: '0.65rem 0.85rem', background: '#090E17' }}>
            <div style={{ color: '#6B7280' }}>Target / Recipient</div>
            <div className="mono" style={{ color: '#F3F4F6', fontWeight: 600, marginTop: '0.15rem' }}>
              {event.targetAgentId || 'N/A'}
            </div>
          </div>

          <div className="panel" style={{ padding: '0.65rem 0.85rem', background: '#090E17' }}>
            <div style={{ color: '#6B7280' }}>Associated Task</div>
            <div className="mono" style={{ color: '#06B6D4', fontWeight: 600, marginTop: '0.15rem' }}>
              {event.taskId || 'Mesh Global'}
            </div>
          </div>
        </div>

        {/* Safe JSON Pretty-Print */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#9CA3AF', fontWeight: 600 }}>FULL EVENT PAYLOAD</span>
            <button onClick={handleCopy} className="btn btn-secondary btn-sm" style={{ padding: '0.2rem 0.5rem' }}>
              <Copy size={12} />
              <span>Copy JSON</span>
            </button>
          </div>
          <pre
            className="mono"
            style={{
              background: '#070B12',
              border: '1px solid #1F2937',
              borderRadius: 'var(--radius-sm)',
              padding: '0.85rem',
              fontSize: '0.775rem',
              color: '#38BDF8',
              maxHeight: '260px',
              overflowY: 'auto',
              lineHeight: 1.4,
            }}
          >
            {JSON.stringify(event.fullPayload || {}, null, 2)}
          </pre>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn btn-secondary">
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
