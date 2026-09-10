import React from 'react';
import { Check, Clock } from 'lucide-react';
import confetti from 'canvas-confetti';
import type { Task } from '../types';
import { calculateEndTime, formatDuration } from '../utils/time';

interface TaskCardProps {
  task: Task;
  onToggleComplete: (taskId: string) => void;
  onEdit: (task: Task) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onToggleComplete,
  onEdit,
}) => {
  const handleCheckClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!task.completed) {
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.8 },
          colors: [task.color, '#30d158', '#0a84ff', '#ff9f0a'],
        });
      } catch (err) {
        // Fallback
      }
    }
    onToggleComplete(task.id);
  };

  const endTimeStr = task.startTime
    ? calculateEndTime(task.startTime, task.durationMinutes)
    : null;

  return (
    <div
      className={`task-card ${task.completed ? 'completed' : ''}`}
      onClick={() => onEdit(task)}
      style={{
        backgroundColor: task.color,
        color: '#ffffff',
        border: 'none',
        boxShadow: `0 4px 18px ${task.color}55`,
      }}
    >
      <div className="task-card-main">
        {/* Task Details (Clean, no icons, no subtasks) */}
        <div className="task-content">
          <div className="task-title" style={{ color: '#ffffff' }}>
            {task.title}
          </div>

          <div className="task-meta" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
            {task.startTime && (
              <span className="task-time-pill" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                <Clock size={13} style={{ display: 'inline', marginRight: 5, verticalAlign: -1 }} />
                {task.startTime} - {endTimeStr} ({formatDuration(task.durationMinutes)})
              </span>
            )}
          </div>

          {task.notes && (
            <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.85)', marginTop: 4 }}>
              {task.notes}
            </div>
          )}
        </div>

        {/* Circular Apple Checkmark Button */}
        <button
          className="task-check-btn"
          style={{
            borderColor: '#ffffff',
            backgroundColor: task.completed ? '#ffffff' : 'rgba(255, 255, 255, 0.2)',
          }}
          onClick={handleCheckClick}
          title={task.completed ? 'Tamamlandı' : 'Tamamla'}
        >
          {task.completed && <Check size={18} strokeWidth={3.5} color={task.color} />}
        </button>
      </div>
    </div>
  );
};
