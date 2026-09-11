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
  // Haftalık navigasyon için seçili tarihe göre Pazartesi bazlı hafta hesaplaması
  const [year, month, day] = selectedDate.split('-').map(Number);
  const curr = new Date(year, month - 1, day);
  const dayOfWeek = curr.getDay();
  const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(curr);
  monday.setDate(curr.getDate() + distanceToMonday);

  // Hafta değiştirme fonksiyonları (7 gün geri / ileri)
  const handlePrevWeek = () => {
    const prev = new Date(monday);
    prev.setDate(monday.getDate() - 7);
    onSelectDate(formatDateString(prev));
  };

  const handleNextWeek = () => {
    const next = new Date(monday);
    next.setDate(monday.getDate() + 7);
    onSelectDate(formatDateString(next));
  };

  const handleCurrentWeek = () => {
    onSelectDate(formatDateString(new Date()));
  };

  // Dokunmatik / iPad / Mobil kaydırma (Swipe) ve Fare ile Gezinme Desteği
  const touchStartXRef = React.useRef<number | null>(null);
  const touchStartYRef = React.useRef<number | null>(null);
  const swipedRef = React.useRef<boolean>(false);
  const lastWheelTimeRef = React.useRef<number>(0);
  const isMouseDownRef = React.useRef<boolean>(false);
  const mouseStartXRef = React.useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    swipedRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null || swipedRef.current) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - touchStartXRef.current;
    const diffY = currentY - touchStartYRef.current;

    // Yatay hareket dikeyden belirginse ve 35px eşiğini aştıysa anında haftayı değiştir
    if (Math.abs(diffX) > 35 && Math.abs(diffX) > Math.abs(diffY) * 1.1) {
      swipedRef.current = true;
      if (diffX > 0) {
        // Sağa kaydırma -> Önceki Hafta
        handlePrevWeek();
      } else {
        // Sola kaydırma -> Sonraki Hafta
        handleNextWeek();
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!swipedRef.current && touchStartXRef.current !== null && touchStartYRef.current !== null) {
      const endX = e.changedTouches[0]?.clientX ?? touchStartXRef.current;
      const endY = e.changedTouches[0]?.clientY ?? touchStartYRef.current;
      const diffX = endX - touchStartXRef.current;
      const diffY = endY - touchStartYRef.current;

      // Hızlı dokunup bırakma (flick) hareketi
      if (Math.abs(diffX) > 25 && Math.abs(diffX) > Math.abs(diffY)) {
        swipedRef.current = true;
        if (diffX > 0) {
          handlePrevWeek();
        } else {
          handleNextWeek();
        }
      }
    }
    touchStartXRef.current = null;
    touchStartYRef.current = null;
    swipedRef.current = false;
  };

  const handleTouchCancel = () => {
    touchStartXRef.current = null;
    touchStartYRef.current = null;
    swipedRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    // Mac / iPad Magic Keyboard trackpad yatay kaydırma desteği
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 25) {
      const now = Date.now();
      if (now - lastWheelTimeRef.current < 450) return;
      lastWheelTimeRef.current = now;
      if (e.deltaX > 25) {
        handleNextWeek();
      } else if (e.deltaX < -25) {
        handlePrevWeek();
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    // Buton veya görev tıklanmışsa sürüklemeyi başlatma
    if ((e.target as HTMLElement).closest('button, input, textarea, .week-task-pill')) return;
    isMouseDownRef.current = true;
    mouseStartXRef.current = e.clientX;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDownRef.current || mouseStartXRef.current === null) return;
    const diffX = e.clientX - mouseStartXRef.current;
    if (Math.abs(diffX) > 50) {
      isMouseDownRef.current = false;
      mouseStartXRef.current = null;
      if (diffX > 0) {
        handlePrevWeek();
      } else {
        handleNextWeek();
      }
    }
  };

  const handleMouseUp = () => {
    isMouseDownRef.current = false;
    mouseStartXRef.current = null;
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

  const isCurrentWeek = weekDays.some((d) => d.isToday);

  return (
    <div
      className="week-view-container"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Week Navigation Header */}
      <div className="week-nav-header">
        <div className="week-range-title">
          {weekRangeLabel}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            className="icon-btn"
            onClick={handlePrevWeek}
            title="Önceki Hafta (Sola kaydırabilirsin)"
            style={{ width: 34, height: 34 }}
          >
            <ChevronLeft size={18} />
          </button>

          {!isCurrentWeek && (
            <button
              type="button"
              className="month-today-btn"
              onClick={handleCurrentWeek}
              title="Bu Haftaya Dön"
            >
              Bu Hafta
            </button>
          )}

          <button
            type="button"
            className="icon-btn"
            onClick={handleNextWeek}
            title="Sonraki Hafta (Sağa kaydırabilirsin)"
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
