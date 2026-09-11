import React, { useEffect } from 'react';
import { Bell, Check, X, Clock } from 'lucide-react';
import type { Task } from '../types';
import { formatDuration } from '../utils/time';

interface TaskAlertBannerProps {
  task: Task | null;
  onClose: () => void;
  onComplete: (taskId: string) => void;
}

export const TaskAlertBanner: React.FC<TaskAlertBannerProps> = ({
  task,
  onClose,
  onComplete,
}) => {
  useEffect(() => {
    if (!task) return;
    // Auto-dismiss after 20 seconds
    const timer = setTimeout(() => {
      onClose();
    }, 20000);
    return () => clearTimeout(timer);
  }, [task, onClose]);

  if (!task) return null;

  const taskColor = task.color || '#ff9f0a';

  return (
    <div className="task-alert-banner-wrapper">
      <div
        className="task-alert-banner-card"
        style={{
          boxShadow: `0 12px 36px rgba(0, 0, 0, 0.4), 0 0 20px ${taskColor}33`,
          borderColor: `${taskColor}66`,
        }}
      >
        {/* Pulsing Alert Icon */}
        <div
          className="task-alert-icon-box"
          style={{
            backgroundColor: `${taskColor}22`,
            color: taskColor,
            border: `1.5px solid ${taskColor}66`,
          }}
        >
          <Bell size={18} className="task-alert-bell-anim" />
        </div>

        {/* Content */}
        <div className="task-alert-content">
          <div className="task-alert-header-row">
            <span className="task-alert-tag" style={{ color: taskColor }}>
              ⏰ GÖREV ZAMANI
            </span>
            <span className="task-alert-time">
              <Clock size={11} />
              {task.startTime} ({formatDuration(task.durationMinutes)})
            </span>
          </div>
          <div className="task-alert-title" title={task.title}>
            {task.title}
          </div>
        </div>

        {/* Actions */}
        <div className="task-alert-actions">
          <button
            type="button"
            className="task-alert-complete-btn"
            onClick={() => onComplete(task.id)}
            title="Görevi Tamamla"
          >
            <Check size={14} strokeWidth={2.5} />
            <span>Tamamla</span>
          </button>
          <button
            type="button"
            className="task-alert-close-btn"
            onClick={onClose}
            title="Kapat"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};
