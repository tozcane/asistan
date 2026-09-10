import React from 'react';
import { Sun, Moon, Sparkles, RotateCcw, User } from 'lucide-react';
import { getTurkishDateLabel, formatDateString } from '../utils/time';
import { getHolidayForDate } from '../utils/holidays';
import type { DayStats, UserProfile, SyncStatus } from '../types';

export type ViewMode = 'day' | 'week' | 'month';

interface HeaderProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  dayStats: DayStats;
  onLoadDemoData: () => void;
  currentUser: UserProfile | null;
  syncStatus: SyncStatus;
  onOpenAuthModal: () => void;
  currentView: ViewMode;
  onChangeView: (view: ViewMode) => void;
}

export const Header: React.FC<HeaderProps> = ({
  selectedDate,
  onSelectDate,
  isDarkMode,
  onToggleTheme,
  dayStats,
  onLoadDemoData,
  currentUser,
  syncStatus,
  onOpenAuthModal,
  currentView,
  onChangeView,
}) => {

  // Generate date pills for a 15-day sliding window around today/selected
  const datePills = React.useMemo(() => {
    const pills: { dateStr: string; dayName: string; dayNum: number; isToday: boolean }[] = [];
    const base = new Date();
    base.setHours(0, 0, 0, 0);

    const todayStr = formatDateString(base);
    const shortDays = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cts'];

    // 5 days in past, 9 days in future
    for (let offset = -5; offset <= 9; offset++) {
      const d = new Date(base);
      d.setDate(base.getDate() + offset);
      const str = formatDateString(d);

      pills.push({
        dateStr: str,
        dayName: shortDays[d.getDay()],
        dayNum: d.getDate(),
        isToday: str === todayStr,
      });
    }
    return pills;
  }, []);

  const dateLabels = getTurkishDateLabel(selectedDate);
  const holiday = getHolidayForDate(selectedDate);
  const completionPercentage = dayStats.totalTasks > 0
    ? Math.round((dayStats.completedTasks / dayStats.totalTasks) * 100)
    : 0;

  return (
    <header className="top-bar">
      {/* Brand & Actions */}
      <div className="top-bar-header">
        <div className="brand-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="brand-icon">⚡</div>
            <span>Structured</span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 11,
              fontWeight: 700,
              color: '#30D158',
              backgroundColor: 'rgba(48, 209, 88, 0.12)',
              border: '1px solid rgba(48, 209, 88, 0.25)',
              padding: '3px 9px',
              borderRadius: 12,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: '#30D158',
              }}
            />
            Otomatik Kayıt Aktif
          </div>
        </div>

        <div className="header-actions">
          {/* Demo Data button */}
          <button
            className="icon-btn"
            onClick={onLoadDemoData}
            title="Örnek Planı Yükle"
          >
            <RotateCcw size={18} />
          </button>

          {/* Theme Toggle */}
          <button
            className="icon-btn"
            onClick={onToggleTheme}
            title={isDarkMode ? 'Açık Moda Geç' : 'Koyu Moda Geç'}
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Account / Cloud Sync Button */}
          <button
            className="icon-btn"
            onClick={onOpenAuthModal}
            title={currentUser ? `${currentUser.displayName || currentUser.email} (Bulut Hesabı)` : 'Google ile Giriş Yap'}
            style={{
              position: 'relative',
              padding: 2,
              overflow: 'visible',
            }}
          >
            {currentUser?.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt="Avatar"
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  objectFit: 'cover',
                }}
              />
            ) : currentUser ? (
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  backgroundColor: '#0A84FF',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {(currentUser.displayName || 'U').charAt(0).toUpperCase()}
              </div>
            ) : (
              <User size={18} />
            )}

            {/* Cloud Sync Status Indicator Dot */}
            {currentUser && (
              <span
                style={{
                  position: 'absolute',
                  bottom: -1,
                  right: -1,
                  width: 9,
                  height: 9,
                  borderRadius: '50%',
                  backgroundColor:
                    syncStatus === 'syncing'
                      ? '#0A84FF'
                      : syncStatus === 'error'
                      ? '#FF453A'
                      : '#30D158',
                  border: '2px solid var(--surface-color)',
                }}
              />
            )}
          </button>
        </div>
      </div>

      {/* View Mode Switcher: Günlük | Haftalık | Aylık */}
      <div className="view-switcher-bar">
        <div className="view-switcher">
          <button
            type="button"
            className={`view-tab ${currentView === 'day' ? 'active' : ''}`}
            onClick={() => onChangeView('day')}
          >
            Günlük
          </button>
          <button
            type="button"
            className={`view-tab ${currentView === 'week' ? 'active' : ''}`}
            onClick={() => onChangeView('week')}
          >
            Haftalık
          </button>
          <button
            type="button"
            className={`view-tab ${currentView === 'month' ? 'active' : ''}`}
            onClick={() => onChangeView('month')}
          >
            Aylık
          </button>
        </div>
      </div>

      {/* Horizontal Date Strip (visible in Day view) */}
      {currentView === 'day' && (
        <div className="date-strip">
          {datePills.map((pill) => {
            const isActive = pill.dateStr === selectedDate;
            const pillHoliday = getHolidayForDate(pill.dateStr);
            return (
              <div
                key={pill.dateStr}
                className={`date-pill ${isActive ? 'active' : ''}`}
                onClick={() => onSelectDate(pill.dateStr)}
                title={pillHoliday ? `${pillHoliday.badge} ${pillHoliday.name}` : undefined}
              >
                <span className="date-pill-day">{pill.dayName}</span>
                <div className="date-pill-num-wrapper">
                  {pill.dayNum}
                  {pillHoliday && (
                    <span
                      style={{
                        position: 'absolute',
                        top: -3,
                        right: -3,
                        fontSize: 9,
                      }}
                    >
                      {pillHoliday.badge}
                    </span>
                  )}
                </div>
                {pill.isToday && <div className="today-dot" />}
              </div>
            );
          })}
        </div>
      )}

      {/* Day Overview Banner (visible in Day view) */}
      {currentView === 'day' && (
        <div className="day-summary-banner">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div className="day-info-title">{dateLabels.title}</div>
              {holiday && (
                <div className="holiday-pill-banner">
                  <span>{holiday.badge}</span>
                  <span>{holiday.name}</span>
                </div>
              )}
            </div>
            <div className="day-info-subtitle">{dateLabels.subtitle}</div>
          </div>

          {dayStats.totalTasks > 0 ? (
            <div className="progress-pill">
              <Sparkles size={16} />
              <span>
                {dayStats.completedTasks}/{dayStats.totalTasks} ({completionPercentage}%)
              </span>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Planlanmış görev yok
            </div>
          )}
        </div>
      )}
    </header>
  );
};
