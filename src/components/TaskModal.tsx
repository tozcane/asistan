import React, { useState, useEffect } from 'react';
import { X, Trash2, Repeat, Calendar } from 'lucide-react';
import type { Task } from '../types';
import { STRUCTURED_COLORS } from '../constants/theme';
import { TimeSelect15 } from './TimeSelect15';
import {
  calculateEndTime,
  parseTimeToMinutes,
  formatDuration,
  getDefaultWeeklyEndDate,
  generateRecurringDates,
} from '../utils/time';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    task: Omit<Task, 'id' | 'completed'> & { id?: string },
    recurringTasks?: Array<Omit<Task, 'id' | 'completed'>>
  ) => void;
  onDelete?: (taskId: string, deleteAllRecurring?: boolean) => void;
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

  // Recurrence state
  const [recurringType, setRecurringType] = useState<'none' | 'weekly' | 'yearly'>('none');
  const [recurringEndDate, setRecurringEndDate] = useState<string>(() => getDefaultWeeklyEndDate(defaultDate));
  const [showRecurringDeleteConfirm, setShowRecurringDeleteConfirm] = useState(false);

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
      setRecurringType(initialTask.recurringType || 'none');
      setRecurringEndDate(initialTask.recurringEndDate || getDefaultWeeklyEndDate(initialTask.date));
      setShowRecurringDeleteConfirm(false);
    } else {
      setTitle('');
      setDate(defaultDate);
      setStartTime(defaultStartTime);
      setEndTime(calculateEndTime(defaultStartTime, defaultDuration));
      setColor(STRUCTURED_COLORS[0].hex);
      setNotes('');
      setInInbox(false);
      setRecurringType('none');
      setRecurringEndDate(getDefaultWeeklyEndDate(defaultDate));
      setShowRecurringDeleteConfirm(false);
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
      const baseTask = {
        id: initialTask?.id,
        title: title.trim(),
        date,
        startTime: inInbox ? undefined : startTime,
        durationMinutes: inInbox ? 0 : durationMinutes,
        color,
        notes: notes.trim() || undefined,
        inInbox,
        recurringType: recurringType !== 'none' ? recurringType : undefined,
        recurringEndDate: recurringType === 'weekly' ? recurringEndDate : undefined,
        recurringSeriesId: initialTask?.recurringSeriesId,
      };

      // If creating a brand new task with recurrence:
      if (!initialTask && recurringType !== 'none' && !inInbox) {
        const seriesId = 'rec_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        const recurringDates = generateRecurringDates(date, recurringType, recurringEndDate);

        const recurringTaskList: Array<Omit<Task, 'id' | 'completed'>> = recurringDates.map((d) => ({
          ...baseTask,
          date: d,
          recurringType,
          recurringSeriesId: seriesId,
          recurringEndDate: recurringType === 'weekly' ? recurringEndDate : undefined,
        }));

        onSave(recurringTaskList[0], recurringTaskList);
      } else {
        onSave(baseTask);
      }
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
  }, [isOpen, title, date, startTime, endTime, durationMinutes, color, notes, inInbox, initialTask, recurringType, recurringEndDate]);

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
        recurringType: recurringType !== 'none' ? recurringType : undefined,
        recurringSeriesId: initialTask.recurringSeriesId,
        recurringEndDate: recurringType === 'weekly' ? recurringEndDate : undefined,
      });
    }, 400);

    return () => clearTimeout(timer);
  }, [title, date, startTime, endTime, durationMinutes, color, notes, inInbox, initialTask, isOpen, recurringType, recurringEndDate]);

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
                onChange={(e) => {
                  const newDate = e.target.value;
                  setDate(newDate);
                  if (recurringEndDate < newDate) {
                    setRecurringEndDate(getDefaultWeeklyEndDate(newDate));
                  }
                }}
              />
            </div>

            {/* Recurrence Selector (Her Hafta & Her Yıl) */}
            <div className="form-field">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Repeat size={14} color="#0A84FF" />
                <span>Tekrarlama Seçeneği</span>
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setRecurringType('none')}
                  style={{
                    backgroundColor: recurringType === 'none' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                    border: recurringType === 'none' ? '1.5px solid var(--text-primary)' : '1px solid var(--border-subtle)',
                    borderRadius: 10,
                    padding: '8px 4px',
                    color: recurringType === 'none' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: 700,
                    fontSize: 12.5,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 5,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>Tek Seferlik</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRecurringType('weekly');
                    if (!recurringEndDate || recurringEndDate < date) {
                      setRecurringEndDate(getDefaultWeeklyEndDate(date));
                    }
                  }}
                  style={{
                    backgroundColor: recurringType === 'weekly' ? 'rgba(10, 132, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    border: recurringType === 'weekly' ? '1.5px solid #0A84FF' : '1px solid var(--border-subtle)',
                    borderRadius: 10,
                    padding: '8px 4px',
                    color: recurringType === 'weekly' ? '#0A84FF' : 'var(--text-secondary)',
                    fontWeight: 700,
                    fontSize: 12.5,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 5,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Repeat size={13} />
                  <span>Her Hafta</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRecurringType('yearly')}
                  style={{
                    backgroundColor: recurringType === 'yearly' ? 'rgba(255, 159, 10, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    border: recurringType === 'yearly' ? '1.5px solid #FF9F0A' : '1px solid var(--border-subtle)',
                    borderRadius: 10,
                    padding: '8px 4px',
                    color: recurringType === 'yearly' ? '#FF9F0A' : 'var(--text-secondary)',
                    fontWeight: 700,
                    fontSize: 12.5,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 5,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Calendar size={13} />
                  <span>Her Yıl</span>
                </button>
              </div>

              {/* Weekly End Date Picker */}
              {recurringType === 'weekly' && (
                <div
                  style={{
                    marginTop: 10,
                    padding: '10px 12px',
                    backgroundColor: 'rgba(10, 132, 255, 0.08)',
                    border: '1px solid rgba(10, 132, 255, 0.2)',
                    borderRadius: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#0A84FF' }}>
                      Tekrar Bitiş Tarihi:
                    </span>
                    <span style={{ fontSize: 10.5, color: 'var(--text-secondary)', fontWeight: 600 }}>
                      Bu tarihe kadar her hafta tekrarlanır
                    </span>
                  </div>
                  <input
                    type="date"
                    className="form-input"
                    value={recurringEndDate}
                    min={date}
                    onChange={(e) => setRecurringEndDate(e.target.value)}
                    required
                  />
                </div>
              )}

              {/* Yearly Repeat Info */}
              {recurringType === 'yearly' && (
                <div
                  style={{
                    marginTop: 10,
                    padding: '8px 12px',
                    backgroundColor: 'rgba(255, 159, 10, 0.08)',
                    border: '1px solid rgba(255, 159, 10, 0.2)',
                    borderRadius: 10,
                    fontSize: 12,
                    color: '#FF9F0A',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span>🎂 Her yıl aynı tarihte (5 yıl boyunca) otomatik takvime işlenecektir.</span>
                </div>
              )}
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
                  if (initialTask.recurringSeriesId) {
                    setShowRecurringDeleteConfirm(true);
                  } else if (confirm('Bu görevi silmek istediğinize emin misiniz?')) {
                    onDelete(initialTask.id, false);
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

        {/* Recurring Task Deletion Confirmation Dialog */}
        {showRecurringDeleteConfirm && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              borderRadius: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
              zIndex: 100,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-strong)',
                borderRadius: 18,
                padding: '20px 18px',
                maxWidth: 360,
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 69, 58, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                }}
              >
                <Repeat size={22} color="#FF453A" />
              </div>

              <h4 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
                Tekrarlanan Etkinliği Sil
              </h4>
              <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 18, lineHeight: 1.45 }}>
                Bu etkinlik tekrarlanan bir serinin parçası. Silme işlemini nasıl yapmak istersiniz?
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                <button
                  type="button"
                  style={{
                    backgroundColor: 'rgba(255, 69, 58, 0.12)',
                    border: '1px solid rgba(255, 69, 58, 0.3)',
                    color: '#FF453A',
                    padding: '11px 14px',
                    borderRadius: 12,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                  onClick={() => {
                    if (initialTask && onDelete) {
                      onDelete(initialTask.id, false);
                      setShowRecurringDeleteConfirm(false);
                      onClose();
                    }
                  }}
                >
                  <Trash2 size={15} />
                  <span>Sadece Bu Etkinliği Sil</span>
                </button>

                <button
                  type="button"
                  style={{
                    backgroundColor: '#FF453A',
                    border: 'none',
                    color: '#ffffff',
                    padding: '11px 14px',
                    borderRadius: 12,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    boxShadow: '0 4px 14px rgba(255, 69, 58, 0.4)',
                  }}
                  onClick={() => {
                    if (initialTask && onDelete) {
                      onDelete(initialTask.id, true);
                      setShowRecurringDeleteConfirm(false);
                      onClose();
                    }
                  }}
                >
                  <X size={15} />
                  <span>Tüm Tekrarlananları Sil</span>
                </button>

                <button
                  type="button"
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                    padding: '9px 14px',
                    borderRadius: 12,
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                    marginTop: 4,
                  }}
                  onClick={() => setShowRecurringDeleteConfirm(false)}
                >
                  Vazgeç
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
