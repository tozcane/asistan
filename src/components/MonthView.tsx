import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Task } from '../types';
import { formatDateString } from '../utils/time';
import { getHolidayForDate } from '../utils/holidays';

interface MonthViewProps {
  tasks: Task[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onSwitchToDayView: (date: string) => void;
}

const MONTH_NAMES_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

const SHORT_MONTH_NAMES_TR = [
  'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
  'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'
];

const WEEKDAY_NAMES_TR = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cts', 'Paz'];

export const MonthView: React.FC<MonthViewProps> = ({
  tasks,
  selectedDate,
  onSelectDate,
  onSwitchToDayView,
}) => {
  const [viewDate, setViewDate] = useState(() => {
    const [y, m] = selectedDate.split('-').map(Number);
    return new Date(y, m - 1, 1);
  });

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // Navigation handlers
  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
    onSelectDate(formatDateString(today));
  };

  // Generate grid days (42 cells: 6 weeks x 7 days)
  const calendarCells = React.useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    
    // Day of week for 1st of month (0 = Sun, 1 = Mon ... 6 = Sat)
    const dayOfWeek = firstDayOfMonth.getDay();
    // Monday as first day:
    const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    
    const startCalendar = new Date(firstDayOfMonth);
    startCalendar.setDate(firstDayOfMonth.getDate() + distanceToMonday);

    const cells: {
      dateStr: string;
      dayNum: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
    }[] = [];

    const todayStr = formatDateString(new Date());

    for (let i = 0; i < 42; i++) {
      const d = new Date(startCalendar);
      d.setDate(startCalendar.getDate() + i);
      const str = formatDateString(d);

      cells.push({
        dateStr: str,
        dayNum: d.getDate(),
        isCurrentMonth: d.getMonth() === month,
        isToday: str === todayStr,
        isSelected: str === selectedDate,
      });
    }

    return cells;
  }, [year, month, selectedDate]);

  return (
    <div className="month-view-container">
      {/* Month Navigation Header */}
      <div className="month-nav-header">
        <div className="month-title">
          <span className="desktop-only">{MONTH_NAMES_TR[month]} {year}</span>
          <span className="mobile-only">{SHORT_MONTH_NAMES_TR[month]} {year}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            className="icon-btn"
            onClick={handlePrevMonth}
            title="Önceki Ay"
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
            onClick={handleNextMonth}
            title="Sonraki Ay"
            style={{ width: 34, height: 34 }}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Weekday headers (Pzt - Paz) */}
      <div className="month-calendar-grid" style={{ marginBottom: 6 }}>
        {WEEKDAY_NAMES_TR.map((dayName) => (
          <div key={dayName} className="month-weekday-header">
            {dayName}
          </div>
        ))}
      </div>

      {/* 42 Calendar Cells Grid */}
      <div className="month-calendar-grid">
        {calendarCells.map((cell) => {
          const holiday = getHolidayForDate(cell.dateStr);
          const dayTasks = tasks.filter((t) => t.date === cell.dateStr && !t.inInbox);

          return (
            <div
              key={cell.dateStr}
              className={`month-day-cell ${
                !cell.isCurrentMonth ? 'other-month' : ''
              } ${cell.isSelected ? 'selected' : ''} ${cell.isToday ? 'today' : ''}`}
              onClick={() => {
                onSelectDate(cell.dateStr);
                onSwitchToDayView(cell.dateStr);
              }}
            >
              {/* Day Number and Holiday icon */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="month-day-number">{cell.dayNum}</span>
                {holiday && (
                  <span title={holiday.name} style={{ fontSize: 13 }}>
                    {holiday.badge}
                  </span>
                )}
              </div>

              {/* Holiday Badge Tag */}
              {holiday && (
                <div className="month-day-holiday-badge" title={holiday.name}>
                  {holiday.name}
                </div>
              )}

              {/* Tasks preview in cell */}
              <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {dayTasks.slice(0, 2).map((t) => (
                  <div
                    key={t.id}
                    className="month-task-pill"
                    style={{
                      backgroundColor: t.color,
                      color: '#ffffff',
                      borderLeft: 'none',
                    }}
                    title={t.title}
                  >
                    {t.title}
                  </div>
                ))}

                {dayTasks.length > 2 && (
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 800, paddingLeft: 2 }}>
                    +{dayTasks.length - 2} görev
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ textAlign: 'center', padding: '24px 0 90px', fontSize: 11, fontWeight: 700, opacity: 0.35, letterSpacing: '1px', userSelect: 'none' }}>
        toe^^
      </div>
    </div>
  );
};
