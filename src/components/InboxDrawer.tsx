import React, { useState } from 'react';
import { X, Plus, Trash2, Check, Clock } from 'lucide-react';
import type { Task } from '../types';

interface InboxDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  inboxTasks: Task[];
  onQuickAdd: (title: string) => void;
  onScheduleTask: (task: Task) => void;
  onToggleComplete: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
}

export const InboxDrawer: React.FC<InboxDrawerProps> = ({
  isOpen,
  onClose,
  inboxTasks,
  onQuickAdd,
  onScheduleTask,
  onToggleComplete,
  onDeleteTask,
}) => {
  const [quickTitle, setQuickTitle] = useState('');

  if (!isOpen) return null;

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    onQuickAdd(quickTitle.trim());
    setQuickTitle('');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>📥</span>
            <div className="modal-title">Gelen Kutusu (Havuz)</div>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: '70vh' }}>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            Henüz saati belirlenmemiş yapılacakları buraya hızlıca not edin. Daha sonra zaman tüneline aktarabilirsiniz.
          </p>

          {/* Quick Add Bar */}
          <form onSubmit={handleQuickAddSubmit} style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              className="form-input"
              style={{ flex: 1 }}
              placeholder="Yeni zamansız görev yazın..."
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              autoFocus
            />
            <button type="submit" className="btn-primary" style={{ padding: '0 18px' }}>
              <Plus size={18} />
            </button>
          </form>

          {/* Inbox Tasks List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
            {inboxTasks.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px 0' }}>
                Gelen kutusu boş! Aklınıza gelen görevleri yukarıdan ekleyebilirsiniz.
              </div>
            ) : (
              inboxTasks.map((task) => (
                <div
                  key={task.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: 'var(--bg-card)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: task.color,
                        flexShrink: 0,
                      }}
                    />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                          textDecoration: task.completed ? 'line-through' : undefined,
                          color: task.completed ? 'var(--text-muted)' : 'var(--text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {task.title}
                      </div>
                      {task.notes && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                          {task.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {/* Toggle complete */}
                    <button
                      type="button"
                      className="task-check-btn"
                      style={{ width: 30, height: 30 }}
                      onClick={() => onToggleComplete(task.id)}
                      title={task.completed ? 'Tamamlandı' : 'Tamamla'}
                    >
                      <Check size={16} strokeWidth={3} />
                    </button>

                    {/* Schedule to day button */}
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: '6px 12px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}
                      onClick={() => onScheduleTask(task)}
                      title="Güne Planla / Saat Belirle"
                    >
                      <Clock size={14} /> Saat Ata
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: 6,
                      }}
                      onClick={() => onDeleteTask(task.id)}
                      title="Sil"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="modal-footer" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
