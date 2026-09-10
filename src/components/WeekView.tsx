import React from 'react';
import { Plus, Check, Clock } from 'lucide-react';
import type { Task } from '../types';
import { formatDateString } from '../utils/time';
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
        const completedCount = dayTasks.filter((t) => t.completed).length;
        const densityClass =
          dayTasks.length >= 6
            ? 'density-dense'
            : dayTasks.length >= 4
            ? 'density-compact'
            : dayTasks.length >= 3
            ? 'density-medium'
            : 'density-normal';

        return (
          <div
            key={day.dateStr}
            className={`week-day-strip ${day.isToday ? 'today' : ''}`}
          >
            {/* Header / Day info for mobile and desktop */}
            <div className="week-strip-main-row">
              {/* Day info (Left) */}
              <div
                className="week-strip-day-col"
                onClick={() => onSwitchToDayView(day.dateStr)}
                title={`${day.dayName} gününün detayına git`}
              >
                <div className="week-strip-num">{day.dayNum}</div>
                <div className="week-strip-name-box">
                  <div className="week-strip-name-row">
                    <span className="week-strip-day-name">{day.dayName}</span>
                    {day.isToday && (
                      <span className="week-strip-today-badge">BUGÜN</span>
                    )}
                  </div>
                  {holiday && (
                    <span className="week-strip-holiday" title={holiday.name}>
                      {holiday.badge} {holiday.name}
                    </span>
                  )}
                </div>
              </div>

              {/* Tasks Area (Middle in desktop, below in mobile) */}
              <div className="week-strip-tasks-area">
                {dayTasks.length === 0 ? (
                  <div
                    className="week-strip-empty"
                    onClick={() => onAddNewAtDate(day.dateStr)}
                  >
                    + Görev ekle
                  </div>
                ) : (
                  <div className={`week-strip-tasks-flow ${densityClass}`}>
                    {dayTasks.map((task) => (
                      <div
                        key={task.id}
                        className={`week-task-pill ${task.completed ? 'completed' : ''}`}
                        style={{
                          backgroundColor: task.color,
                        }}
                        onClick={() => onEditTask(task)}
                      >
                        <button
                          type="button"
                          className="week-task-check"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleComplete(task.id);
                          }}
                          aria-label="Tamamla"
                        >
                          {task.completed && (
                            <Check size={11} strokeWidth={3.5} color={task.color} />
                          )}
                        </button>
                        <span className="week-task-title">{task.title}</span>
                        {task.startTime && (
                          <span className="week-task-time">
                            <Clock size={10} /> {task.startTime}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions (Right) */}
              <div className="week-strip-actions">
                {dayTasks.length > 0 && (
                  <span className="week-strip-count">
                    {completedCount}/{dayTasks.length}
                  </span>
                )}
                <button
                  type="button"
                  className="week-strip-add-btn"
                  onClick={() => onAddNewAtDate(day.dateStr)}
                  title="Bu güne yeni görev ekle"
                >
                  <Plus size={15} />
                </button>
                <button
                  type="button"
                  className="week-strip-goto-btn"
                  onClick={() => onSwitchToDayView(day.dateStr)}
                >
                  Güne Git
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
