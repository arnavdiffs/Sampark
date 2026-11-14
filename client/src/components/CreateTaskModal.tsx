import React, { useState } from 'react';
import { X, ListTodo, Plus } from 'lucide-react';
import { PermissionScope, TaskPriority } from '../types';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (taskData: any) => Promise<void>;
}

export function CreateTaskModal({ isOpen, onClose, onSubmit }: CreateTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [requiredScope, setRequiredScope] = useState<PermissionScope>('frontend');
  const [capabilitiesInput, setCapabilitiesInput] = useState('react, typescript');
  const [repository, setRepository] = useState('sampark-mesh/client-portal');
  const [branch, setBranch] = useState('feature/new-task');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const capabilities = capabilitiesInput
        .split(',')
        .map((c) => c.trim().toLowerCase())
        .filter(Boolean);

      await onSubmit({
        title,
        description,
        priority,
        requiredScope,
        requiredCapabilities: capabilities,
        repository,
        branch,
      });
      setTitle('');
      setDescription('');
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
            <div style={{ background: '#10b98126', padding: '0.4rem', borderRadius: 'var(--radius-sm)' }}>
              <ListTodo size={20} color="#10B981" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F3F4F6' }}>Create New Mesh Task</h3>
              <p style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Define a scoped task ready for permission-checked agent claiming.</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Task Title *</label>
            <input
              type="text"
              required
              className="input"
              placeholder="e.g. Implement refresh token rotation handler"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description & Context Hints</label>
            <textarea
              className="textarea"
              rows={3}
              placeholder="Describe deliverables, contracts to respect, and file targets..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Permission Scope *</label>
              <select
                className="select"
                value={requiredScope}
                onChange={(e) => setRequiredScope(e.target.value as PermissionScope)}
              >
                <option value="frontend">frontend</option>
                <option value="backend">backend</option>
                <option value="testing">testing</option>
                <option value="security">security</option>
                <option value="docs">docs</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Priority</label>
              <select
                className="select"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Required Capabilities (comma separated)</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. react, typescript, browser-tests"
              value={capabilitiesInput}
              onChange={(e) => setCapabilitiesInput(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Repository</label>
              <input
                type="text"
                className="input"
                value={repository}
                onChange={(e) => setRepository(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Target Branch</label>
              <input
                type="text"
                className="input"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary">
              <Plus size={16} />
              <span>{isSubmitting ? 'Creating...' : 'Create Task'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
