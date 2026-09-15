import React, { useState, useMemo, useRef } from 'react';
import {
  Clock,
  Check,
  Plus,
  ChevronLeft,
  ChevronRight,
  Search,
  CheckCircle2,
  Circle,
  CalendarDays,
  ArrowRight
} from 'lucide-react';
import type { Task } from '../types';
import {
  getTodayDateString,
  calculateEndTime,
  formatDuration,
  getTurkishDateLabel
} from '../utils/time';
import { getHolidayForDate } from '../utils/holidays';

interface ListViewProps {
  tasks: Task[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onToggleComplete: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  onAddNewAtDate: (date: string) => void;
  onSwitchToDayView: (date: string) => void;
}

const MONTH_NAMES_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

export const ListView: React.FC<ListViewProps> = ({
  tasks,
  selectedDate,
  onSelectDate,
  onToggleComplete,
  onEditTask,
  onAddNewAtDate,
  onSwitchToDayView,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [hideCompleted, setHideCompleted] = useState(false);
  const todayStr = getTodayDateString();

  const [viewDate, setViewDate] = useState(() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    return new Date(y, m - 1, d);
  });

  const todaySectionRef = useRef<HTMLDivElement | null>(null);

  // Month navigation
  const handlePrevMonth = () => {
    setViewDate((prev) => {
      const next = new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
      return next;
    });
  };

  const handleNextMonth = () => {
    setViewDate((prev) => {
      const next = new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
      return next;
    });
  };

  const handleToday = () => {
    const now = new Date();
    setViewDate(now);
    onSelectDate(todayStr);
    if (todaySectionRef.current) {
      todaySectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Group scheduled tasks by date
  const scheduledTasks = useMemo(() => {
    return tasks.filter((t) => !t.inInbox && t.date);
  }, [tasks]);

  // Distinct sorted dates that have tasks, plus today
  const activeDates = useMemo(() => {
    const dateSet = new Set<string>();
    dateSet.add(todayStr);
    if (selectedDate) dateSet.add(selectedDate);

    scheduledTasks.forEach((t) => {
      if (t.date) dateSet.add(t.date);
    });

    const arr = Array.from(dateSet).sort();
    return arr;
  }, [scheduledTasks, todayStr, selectedDate]);

  // Tasks mapped by date
  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    activeDates.forEach((d) => {
      map[d] = [];
    });

    scheduledTasks.forEach((task) => {
      if (!map[task.date]) {
        map[task.date] = [];
      }
      // Apply search & hide completed filters
      if (hideCompleted && task.completed) return;
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchTitle = task.title.toLowerCase().includes(query);
        const matchNotes = task.notes?.toLowerCase().includes(query);
        if (!matchTitle && !matchNotes) return;
      }
      map[task.date].push(task);
    });

    // Sort tasks in each date by start time
    Object.keys(map).forEach((d) => {
      map[d].sort((a, b) => {
        if (!a.startTime) return 1;
        if (!b.startTime) return -1;
        return a.startTime.localeCompare(b.startTime);
      });
    });

    return map;
  }, [activeDates, scheduledTasks, hideCompleted, searchTerm]);

  // Total visible task count
  const totalVisibleTasks = useMemo(() => {
    return Object.values(tasksByDate).reduce((acc, list) => acc + list.length, 0);
  }, [tasksByDate]);

  return (
    <div className="list-view-container">
      {/* Google Calendar Style Sub-Header / Controls */}
      <div className="list-view-header">
        <div className="list-view-nav">
          <button
            type="button"
            className="month-nav-arrow"
            onClick={handlePrevMonth}
            title="Önceki Ay"
          >
            <ChevronLeft size={18} />
          </button>

          <span className="list-view-title">
            {MONTH_NAMES_TR[viewDate.getMonth()]} {viewDate.getFullYear()}
          </span>
          <span className="holiday-badge-compact desktop-only" style={{ fontSize: 11 }}>
            {totalVisibleTasks} görev
          </span>

          <button
            type="button"
            className="month-nav-arrow"
            onClick={handleNextMonth}
            title="Sonraki Ay"
          >
            <ChevronRight size={18} />
          </button>

          <button
            type="button"
            className="month-today-btn"
            onClick={handleToday}
          >
            Bugün
          </button>
        </div>

        {/* Search and Filters */}
        <div className="list-view-filters">
          <div className="list-search-box">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              placeholder="Görevlerde ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="list-search-input"
            />
          </div>

          <button
            type="button"
            className={`list-filter-btn ${hideCompleted ? 'active' : ''}`}
            onClick={() => setHideCompleted(!hideCompleted)}
            title="Tamamlananları gizle veya göster"
          >
            <CheckCircle2 size={14} />
            <span className="desktop-only">
              {hideCompleted ? 'Tamamlananlar Gizli' : 'Tümü'}
            </span>
          </button>
        </div>
      </div>

      {/* Main Agenda / Schedule Flow */}
      <div className="list-view-flow">
        {activeDates.length === 0 ? (
          <div className="list-empty-state">
            <CalendarDays size={48} strokeWidth={1.2} color="var(--text-muted)" />
            <h3>Henüz planlanmış bir görev yok</h3>
            <p>Günlük rutininizi veya etkinliklerinizi eklemeye başlayın.</p>
            <button
              type="button"
              className="add-task-btn"
              onClick={() => onAddNewAtDate(todayStr)}
            >
              <Plus size={16} />
              <span>İlk Görevi Ekle</span>
            </button>
          </div>
        ) : (
          activeDates.map((dateStr) => {
            const dateTasks = tasksByDate[dateStr] || [];
            const [, m, d] = dateStr.split('-').map(Number);
            const isToday = dateStr === todayStr;
            const holiday = getHolidayForDate(dateStr);
            const dateLabel = getTurkishDateLabel(dateStr);

            // Hide days with 0 tasks if search is active
            if (searchTerm.trim() && dateTasks.length === 0) {
              return null;
            }

            return (
              <div
                key={dateStr}
                ref={isToday ? todaySectionRef : null}
                className={`list-day-section ${isToday ? 'is-today' : ''}`}
              >
                {/* Left Date Column */}
                <div className="list-day-date-col">
                  <div className={`list-day-badge ${isToday ? 'today-badge' : ''}`}>
                    <span className="day-number">{d}</span>
                    <span className="day-name">{dateLabel.shortTitle}</span>
                  </div>
                  {isToday && <span className="today-chip">Bugün</span>}
                </div>

                {/* Right Content Column: Events List */}
                <div className="list-day-content-col">
                  <div className="list-day-header-row">
                    <div className="day-full-label">
                      <span>{dateLabel.subtitle}</span>
                      {holiday && (
                        <span className="holiday-badge-compact">
                          {holiday.badge} {holiday.name}
                        </span>
                      )}
                    </div>

                    <div className="list-day-actions">
                      <button
                        type="button"
                        className="list-add-day-btn"
                        onClick={() => onAddNewAtDate(dateStr)}
                        title={`${d} ${MONTH_NAMES_TR[m - 1]} gününe görev ekle`}
                      >
                        <Plus size={13} />
                        <span className="desktop-only">Ekle</span>
                      </button>

                      <button
                        type="button"
                        className="list-go-day-btn"
                        onClick={() => onSwitchToDayView(dateStr)}
                        title="Günlük detay görünümüne geç"
                      >
                        <ArrowRight size={13} />
                        <span className="desktop-only">Güne Git</span>
                      </button>
                    </div>
                  </div>

                  {/* Tasks List */}
                  <div className="list-day-tasks-group">
                    {dateTasks.length === 0 ? (
                      <div className="list-no-tasks-row">
                        <span className="no-tasks-text">Planlanmış etkinlik yok</span>
                        <button
                          type="button"
                          className="quick-add-link"
                          onClick={() => onAddNewAtDate(dateStr)}
                        >
                          + Görev planla
                        </button>
                      </div>
                    ) : (
                      dateTasks.map((task) => {
                        const endTime = task.startTime && task.durationMinutes
                          ? calculateEndTime(task.startTime, task.durationMinutes)
                          : null;

                        const completedSubtasks = task.subtasks?.filter((s) => s.completed).length || 0;
                        const totalSubtasks = task.subtasks?.length || 0;

                        return (
                          <div
                            key={task.id}
                            className={`list-task-card ${task.completed ? 'completed' : ''}`}
                            onClick={() => onEditTask(task)}
                          >
                            {/* Color bar indicator */}
                            <div
                              className="list-task-color-bar"
                              style={{ backgroundColor: task.color || '#ff9f0a' }}
                            />

                            {/* Time badge */}
                            <div className="list-task-time-box">
                              {task.startTime ? (
                                <>
                                  <span className="time-start">{task.startTime}</span>
                                  {endTime && <span className="time-end">{endTime}</span>}
                                </>
                              ) : (
                                <span className="time-allday">Tüm gün</span>
                              )}
                            </div>

                            {/* Task Info */}
                            <div className="list-task-main">
                              <div className="list-task-title-row">
                                <span className="list-task-title">{task.title}</span>
                                {task.durationMinutes > 0 && (
                                  <span className="list-task-duration">
                                    <Clock size={11} />
                                    {formatDuration(task.durationMinutes)}
                                  </span>
                                )}
                              </div>

                              {/* Notes & Subtasks snippet */}
                              <div className="list-task-meta-row">
                                {totalSubtasks > 0 && (
                                  <span className="subtasks-badge">
                                    <Check size={10} /> {completedSubtasks}/{totalSubtasks} alt görev
                                  </span>
                                )}
                                {task.notes && (
                                  <span className="notes-snippet">{task.notes}</span>
                                )}
                              </div>
                            </div>

                            {/* Checkbox button */}
                            <button
                              type="button"
                              className={`list-task-check-btn ${task.completed ? 'checked' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleComplete(task.id);
                              }}
                              title={task.completed ? 'Tamamlanmadı olarak işaretle' : 'Tamamla'}
                            >
                              {task.completed ? (
                                <CheckCircle2 size={20} color="#30D158" />
                              ) : (
                                <Circle size={20} color="var(--text-muted)" />
                              )}
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Signature */}
      <div className="list-view-footer">
        <span className="footer-signature">toe^^</span>
      </div>
    </div>
  );
};
