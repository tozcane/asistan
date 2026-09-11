import React from 'react';
import { Plus, Check, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
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

const MONTH_NAMES_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

export const WeekView: React.FC<WeekViewProps> = ({
  tasks,
  selectedDate,
  onSelectDate,
  onToggleComplete,
  onEditTask,
  onAddNewAtDate,
  onSwitchToDayView,
}) => {
  const [viewDate, setViewDate] = React.useState(() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    return new Date(y, m - 1, d);
  });

  // viewDate değiştikçe Pazartesi bazlı hafta başlangıcını hesapla
  const monday = React.useMemo(() => {
    const curr = new Date(viewDate);
    const dayOfWeek = curr.getDay();
    const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const m = new Date(curr);
    m.setDate(curr.getDate() + distanceToMonday);
    return m;
  }, [viewDate]);

  // Hafta değiştirme fonksiyonları (Aynen Ay Değiştirme Butonları Gibi)
  const handlePrevWeek = () => {
    setViewDate((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() - 7);
      return next;
    });
  };

  const handleNextWeek = () => {
    setViewDate((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + 7);
      return next;
    });
  };

  const handleToday = () => {
    const today = new Date();
    setViewDate(today);
    onSelectDate(formatDateString(today));
  };

  // Haftanın 7 gününü hesapla
  const weekDays = React.useMemo(() => {
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
  }, [monday]);

  // Hafta başlığı formatı (örn: "8 - 14 Eylül 2026" veya "29 Eylül - 5 Ekim 2026")
  const weekRangeLabel = React.useMemo(() => {
    if (weekDays.length < 7) return '';
    const firstDay = weekDays[0];
    const lastDay = weekDays[6];
    const [y1, m1] = firstDay.dateStr.split('-').map(Number);
    const [y2, m2] = lastDay.dateStr.split('-').map(Number);

    if (m1 === m2 && y1 === y2) {
      return `${firstDay.dayNum} – ${lastDay.dayNum} ${MONTH_NAMES_TR[m1 - 1]} ${y1}`;
    } else if (y1 === y2) {
      return `${firstDay.dayNum} ${MONTH_NAMES_TR[m1 - 1]} – ${lastDay.dayNum} ${MONTH_NAMES_TR[m2 - 1]} ${y1}`;
    } else {
      return `${firstDay.dayNum} ${MONTH_NAMES_TR[m1 - 1]} ${y1} – ${lastDay.dayNum} ${MONTH_NAMES_TR[m2 - 1]} ${y2}`;
    }
  }, [weekDays]);

  return (
    <div className="week-view-container">
      {/* Week Navigation Header - Aynen Ay Değiştirme Butonları Gibi */}
      <div className="month-nav-header">
        <div className="month-title">
          {weekRangeLabel}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            className="icon-btn"
            onClick={handlePrevWeek}
            title="Önceki Hafta"
            style={{ width: 34, height: 34 }}
          >
            <ChevronLeft size={18} />
          </button>

          <button
            type="button"
            className="month-today-btn"
            onClick={handleToday}
          >
            Bugün
          </button>

          <button
            type="button"
            className="icon-btn"
            onClick={handleNextWeek}
            title="Sonraki Hafta"
            style={{ width: 34, height: 34 }}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
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
