import React from 'react';
import { Plus, Check, Clock } from 'lucide-react';
import type { Task } from '../types';
import { formatDateString, formatDuration } from '../utils/time';
import { getHolidayForDate } from '../utils/holidays';

interface WeekViewProps {
  tasks: Task[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onToggleComplete: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  onAddNewAtDate: (date: string) => void;
  onSwitchToDayView: (date: string) => void;
}

export const WeekView: React.FC<WeekViewProps> = ({
  tasks,
  selectedDate,
  onToggleComplete,
  onEditTask,
  onAddNewAtDate,
  onSwitchToDayView,
}) => {
  // Compute Monday of the current week containing selectedDate
  const weekDays = React.useMemo(() => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const curr = new Date(year, month - 1, day);
    
    // In JS, getDay(): 0 = Sun, 1 = Mon ... 6 = Sat
    // To make Monday the first day:
    const dayOfWeek = curr.getDay();
    const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    
    const monday = new Date(curr);
    monday.setDate(curr.getDate() + distanceToMonday);

    const days: { dateStr: string; dayName: string; dayNum: number; isToday: boolean }[] = [];
    const dayNames = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
    const todayStr = formatDateString(new Date());

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const str = formatDateString(d);
      days.push({
        dateStr: str,
        dayName: dayNames[i],
        dayNum: d.getDate(),
        isToday: str === todayStr,
      });
    }

    return days;
  }, [selectedDate]);

  return (
    <div className="week-view-container">
      {weekDays.map((day) => {
        const dayTasks = tasks
          .filter((t) => t.date === day.dateStr && !t.inInbox)
          .sort((a, b) => ((a.startTime || '00:00') > (b.startTime || '00:00') ? 1 : -1));

        const holiday = getHolidayForDate(day.dateStr);
        const totalMinutes = dayTasks.reduce((acc, t) => acc + (t.durationMinutes || 0), 0);
        const completedCount = dayTasks.filter((t) => t.completed).length;

        return (
          <div
            key={day.dateStr}
            className={`week-day-card ${day.isToday ? 'today' : ''}`}
          >
            {/* Header of the Day */}
            <div className="week-day-header">
              <div className="week-day-title-box">
                <div className="week-day-num">{day.dayNum}</div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="week-day-name">{day.dayName}</span>
                    {day.isToday && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          backgroundColor: '#0a84ff',
                          color: '#ffffff',
                          padding: '1px 6px',
                          borderRadius: 8,
                        }}
                      >
                        BUGÜN
                      </span>
                    )}
                  </div>
                  {/* Holiday Badge (Resmi / Dini Bayram) */}
                  {holiday && (
                    <div className="holiday-pill-banner" style={{ marginTop: 2, padding: '2px 8px', fontSize: 12 }}>
                      <span>{holiday.badge}</span>
                      <span>{holiday.name}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Day stats & Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {dayTasks.length > 0 && (
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>
                    {completedCount}/{dayTasks.length} ({formatDuration(totalMinutes)})
                  </span>
                )}

                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => onAddNewAtDate(day.dateStr)}
                  title="Bu güne görev ekle"
                  style={{ width: 32, height: 32 }}
                >
                  <Plus size={16} />
                </button>

                <button
                  type="button"
                  onClick={() => onSwitchToDayView(day.dateStr)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '6px 10px',
                    borderRadius: 10,
                    cursor: 'pointer',
                  }}
                >
                  Güne Git
                </button>
              </div>
            </div>

            {/* List of Tasks in this Day (White cards, Black text) */}
            <div className="week-day-tasks-list">
              {dayTasks.length === 0 ? (
                <div
                  style={{
                    padding: '14px 10px',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontSize: 13,
                    fontStyle: 'italic',
                  }}
                >
                  Görev planlanmadı
                </div>
              ) : (
                dayTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`task-card ${task.completed ? 'completed' : ''}`}
                    onClick={() => onEditTask(task)}
                    style={{
                      background: task.color,
                      padding: '10px 14px',
                      cursor: 'pointer',
                      borderRadius: 14,
                      border: 'none',
                      boxShadow: `0 4px 14px ${task.color}55`,
                      color: '#ffffff',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 15,
                            fontWeight: 800,
                            color: '#ffffff',
                            textDecoration: task.completed ? 'line-through' : 'none',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {task.title}
                        </div>

                        {task.startTime && (
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: 'rgba(255, 255, 255, 0.9)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              marginTop: 2,
                            }}
                          >
                            <Clock size={11} />
                            <span>
                              {task.startTime} ({formatDuration(task.durationMinutes)})
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Complete Checkbox */}
                      <button
                        type="button"
                        className="task-check-btn"
                        style={{
                          width: 26,
                          height: 26,
                          borderColor: '#ffffff',
                          backgroundColor: task.completed ? '#ffffff' : 'rgba(255, 255, 255, 0.2)',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleComplete(task.id);
                        }}
                      >
                        {task.completed && <Check size={14} strokeWidth={3.5} color={task.color} />}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
