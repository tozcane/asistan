import React, { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import type { Task } from '../types';
import { STRUCTURED_COLORS } from '../constants/theme';
import { TimeSelect15 } from './TimeSelect15';
import { calculateEndTime, parseTimeToMinutes, formatDuration } from '../utils/time';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Omit<Task, 'id' | 'completed'> & { id?: string }) => void;
  onDelete?: (taskId: string) => void;
  initialTask?: Task | null;
  defaultDate: string;
  defaultStartTime?: string;
  defaultDuration?: number;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialTask,
  defaultDate,
  defaultStartTime = '09:00',
  defaultDuration = 60,
}) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState(defaultStartTime);
  const [endTime, setEndTime] = useState(() => calculateEndTime(defaultStartTime, defaultDuration));
  const [color, setColor] = useState(STRUCTURED_COLORS[0].hex);
  const [notes, setNotes] = useState('');
  const [inInbox, setInInbox] = useState(false);

  // Compute duration in minutes dynamically from startTime and endTime
  const durationMinutes = (() => {
    const startMin = parseTimeToMinutes(startTime);
    const endMin = parseTimeToMinutes(endTime);
    let diff = endMin - startMin;
    if (diff <= 0) diff += 1440; // in case across midnight
    return diff;
  })();

  // Pre-fill when editing or opening
  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.title);
      setDate(initialTask.date);
      const start = initialTask.startTime || defaultStartTime;
      const dur = initialTask.durationMinutes || 60;
      setStartTime(start);
      setEndTime(calculateEndTime(start, dur));
      setColor(initialTask.color || STRUCTURED_COLORS[0].hex);
      setNotes(initialTask.notes || '');
      setInInbox(!!initialTask.inInbox);
    } else {
      setTitle('');
      setDate(defaultDate);
      setStartTime(defaultStartTime);
      setEndTime(calculateEndTime(defaultStartTime, defaultDuration));
      setColor(STRUCTURED_COLORS[0].hex);
      setNotes('');
      setInInbox(false);
    }
  }, [initialTask, isOpen, defaultDate, defaultStartTime, defaultDuration]);

  const handleStartTimeChange = (newStart: string) => {
    setStartTime(newStart);
    const curDur = durationMinutes > 0 ? durationMinutes : 60;
    setEndTime(calculateEndTime(newStart, curDur));
  };

  const handleEndTimeChange = (newEnd: string) => {
    setEndTime(newEnd);
  };

  const handleSaveAndClose = () => {
    if (title.trim()) {
      onSave({
        id: initialTask?.id,
        title: title.trim(),
        date,
        startTime: inInbox ? undefined : startTime,
        durationMinutes: inInbox ? 0 : durationMinutes,
        color,
        notes: notes.trim() || undefined,
        inInbox,
      });
    }
    onClose();
  };

  // Keyboard escape listener - auto saves on escape if title exists
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSaveAndClose();
      }
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, title, date, startTime, endTime, durationMinutes, color, notes, inInbox, initialTask]);

  // Real-time background auto-save for existing tasks
  useEffect(() => {
    if (!initialTask || !isOpen || !title.trim()) return;

    const timer = setTimeout(() => {
      onSave({
        id: initialTask.id,
        title: title.trim(),
        date,
        startTime: inInbox ? undefined : startTime,
        durationMinutes: inInbox ? 0 : durationMinutes,
        color,
        notes: notes.trim() || undefined,
        inInbox,
      });
    }, 400);

    return () => clearTimeout(timer);
  }, [title, date, startTime, endTime, durationMinutes, color, notes, inInbox, initialTask, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSaveAndClose();
  };

  return (
    <div className="modal-backdrop" onClick={handleSaveAndClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="modal-title">
              {initialTask ? 'Görevi Düzenle' : 'Yeni Görev'}
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#30D158',
                backgroundColor: 'rgba(48, 209, 88, 0.12)',
                padding: '2px 8px',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: '#30D158' }} />
              Otomatik Kayıt
            </div>
          </div>
          <button className="icon-btn" onClick={handleSaveAndClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="modal-body">
            {/* Title */}
            <div className="form-field">
              <label className="form-label">Görev Başlığı</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ne yapacaksınız? (ör. Sabah Koşusu, Toplantı)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
                required
              />
            </div>

            {/* 4 Main Color Selection */}
            <div className="form-field">
              <label className="form-label">Renk Seçimi (4 Ana Renk)</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                {STRUCTURED_COLORS.map((c) => {
                  const isSelected = color === c.hex;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setColor(c.hex)}
                      style={{
                        backgroundColor: isSelected ? c.hex : 'rgba(255, 255, 255, 0.05)',
                        border: `2px solid ${c.hex}`,
                        borderRadius: 12,
                        padding: '10px 6px',
                        color: isSelected ? '#ffffff' : c.hex,
                        fontWeight: 700,
                        fontSize: 14,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 4,
                        transition: 'all 0.2s ease',
                        boxShadow: isSelected ? `0 4px 14px ${c.hex}50` : 'none',
                      }}
                    >
                      <div
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: '50%',
                          backgroundColor: c.hex,
                          border: isSelected ? '2px solid #ffffff' : 'none',
                        }}
                      />
                      <span>{c.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Timing / Inbox Toggle */}
            <div className="form-field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label">Zamanlama</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', color: 'var(--text-secondary)' }}>
                  <input
                    type="checkbox"
                    checked={inInbox}
                    onChange={(e) => setInInbox(e.target.checked)}
                  />
                  Gelen Kutusuna Kaydet (Zamansız)
                </label>
              </div>

              {!inInbox && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
                    <TimeSelect15
                      label="Başlangıç Saati"
                      value={startTime}
                      onChange={handleStartTimeChange}
                      color={color}
                    />
                    <TimeSelect15
                      label="Bitiş Saati"
                      value={endTime}
                      onChange={handleEndTimeChange}
                      color={color}
                    />
                  </div>

                  {/* Duration summary indicator */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 12,
                      padding: '8px 14px',
                      marginTop: 10,
                      fontSize: 13,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <span>Toplam Süre:</span>
                    <span style={{ fontWeight: 800, color: color }}>
                      {formatDuration(durationMinutes)}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Date Picker */}
            <div className="form-field">
              <label className="form-label">Tarih</label>
              <input
                type="date"
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            {/* Notes */}
            <div className="form-field">
              <label className="form-label">Notlar & Açıklama (İsteğe bağlı)</label>
              <textarea
                className="form-input"
                rows={2}
                placeholder="Görevle ilgili kısa detaylar..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="modal-footer">
            {initialTask && onDelete ? (
              <button
                type="button"
                className="btn-danger"
                onClick={() => {
                  if (confirm('Bu görevi silmek istediğinize emin misiniz?')) {
                    onDelete(initialTask.id);
                    onClose();
                  }
                }}
              >
                <Trash2 size={16} style={{ display: 'inline', marginRight: 4 }} /> Sil
              </button>
            ) : <div />}

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  color: '#30D158',
                  fontWeight: 600,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#30D158' }} />
                Anında Kaydedildi
              </div>
              <button
                type="submit"
                className="btn-primary"
                style={{ backgroundColor: color }}
              >
                Tamam
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
