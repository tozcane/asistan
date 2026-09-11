import React, { useState, useEffect } from 'react';
import { Plus, Coffee } from 'lucide-react';
import type { Task } from '../types';
import { buildTimeline, formatDuration } from '../utils/time';
import { TaskCard } from './TaskCard';
import { DailyNotes } from './DailyNotes';

interface TimelineProps {
  tasks: Task[];
  selectedDate: string;
  isToday: boolean;
  onToggleComplete: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  onAddNewAtTime: (startTime: string, durationMinutes: number) => void;
  onOpenNewTaskModal: () => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  tasks,
  selectedDate,
  isToday,
  onToggleComplete,
  onEditTask,
  onAddNewAtTime,
  onOpenNewTaskModal,
}) => {
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const mins = now.getMinutes().toString().padStart(2, '0');
      setCurrentTimeStr(`${hours}:${mins}`);
    };

    updateTime();
    const timer = setInterval(updateTime, 30000); // update every 30s
    return () => clearInterval(timer);
  }, []);

  const slots = buildTimeline(tasks);

  if (slots.length === 0) {
    return (
      <div className="empty-timeline">
        <div className="empty-icon">🗓️</div>
        <div className="empty-title">Bu güne henüz görev eklenmedi</div>
        <div className="empty-desc">
          Gününüzü saat saat planlayarak odaklanmanızı artırın ve serbest zamanlarınızı görün.
        </div>
        <button
          className="add-task-btn"
          style={{ marginTop: 20 }}
          onClick={onOpenNewTaskModal}
        >
          <Plus size={18} /> İlk Görevi Ekle
        </button>
      </div>
    );
  }

  return (
    <div className="timeline-view">
      {/* Background Vertical Spine Line */}
      <div className="timeline-spine" />

      {/* Live Current Time Indicator if Today */}
      {isToday && currentTimeStr && (
        <div className="now-indicator-row">
          <span className="now-badge">ŞU AN {currentTimeStr}</span>
          <div className="now-line" />
        </div>
      )}

      {/* Render Slots */}
      {slots.map((slot, index) => {
        if (slot.type === 'task') {
          return (
            <div key={slot.task.id} className="timeline-row">
              <div className="time-col">
                {slot.task.startTime || '--:--'}
              </div>
              <TaskCard
                task={slot.task}
                onToggleComplete={onToggleComplete}
                onEdit={onEditTask}
              />
            </div>
          );
        }

        if (slot.type === 'free') {
          return (
            <div key={`free-${index}`} className="timeline-row">
              <div className="time-col" style={{ color: 'var(--text-muted)' }}>
                {slot.startTime}
              </div>

              <div
                className="free-time-card"
                onClick={() => onAddNewAtTime(slot.startTime, slot.durationMinutes)}
                title="Bu boşluğa görev eklemek için tıklayın"
              >
                <div className="free-time-text">
                  <Coffee size={15} style={{ color: '#f1c40f' }} />
                  <span>
                    <span className="desktop-only">{formatDuration(slot.durationMinutes)} Boş Zaman ({slot.startTime} - {slot.endTime})</span>
                    <span className="mobile-only">{formatDuration(slot.durationMinutes)} Boş</span>
                  </span>
                </div>
                <div className="free-time-action">
                  <Plus size={13} />
                  <span className="desktop-only"> Görev Ekle</span>
                  <span className="mobile-only"> Ekle</span>
                </div>
              </div>
            </div>
          );
        }

      })}

      {/* Daily Notes & Apple Pencil Scratchpad Box */}
      <DailyNotes selectedDate={selectedDate} />

      <div style={{ textAlign: 'center', padding: '24px 0 90px', fontSize: 11, fontWeight: 700, opacity: 0.35, letterSpacing: '1px', userSelect: 'none' }}>
        toe^^
      </div>
    </div>
  );
};
