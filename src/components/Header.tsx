import React from 'react';
import { Sun, Moon, Sparkles, Calendar, PenTool, ChevronLeft, ChevronRight, Mic } from 'lucide-react';
import { getTurkishDateLabel, formatDateString } from '../utils/time';
import { getHolidayForDate } from '../utils/holidays';
import type { DayStats } from '../types';

export type ViewMode = 'day' | 'week' | 'month';

interface HeaderProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  dayStats: DayStats;
  currentView: ViewMode;
  onChangeView: (view: ViewMode) => void;
  onOpenSiriModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  selectedDate,
  onSelectDate,
  isDarkMode,
  onToggleTheme,
  dayStats,
  currentView,
  onChangeView,
  onOpenSiriModal,
}) => {

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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              className="brand-icon"
              style={{
                position: 'relative',
                width: 34,
                height: 34,
                background: 'linear-gradient(135deg, #0A84FF 0%, #0056b3 100%)',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(10, 132, 255, 0.35)',
              }}
            >
              {/* Takvim Simgesi */}
              <Calendar size={18} color="#ffffff" strokeWidth={2.2} />

              {/* Takvim Üzerindeki Kalem Simgesi */}
              <div
                style={{
                  position: 'absolute',
                  bottom: -2,
                  right: -2,
                  background: '#FF9F0A',
                  borderRadius: '50%',
                  width: 16,
                  height: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #000000',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.4)',
                }}
              >
                <PenTool size={9} color="#ffffff" strokeWidth={2.6} />
              </div>
            </div>
            <span>Asistan</span>
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
          {/* Theme Toggle */}
          <button
            className="icon-btn"
            onClick={onToggleTheme}
            title={isDarkMode ? 'Açık Moda Geç' : 'Koyu Moda Geç'}
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Siri Voice Button */}
          <button
            className="icon-btn"
            onClick={onOpenSiriModal}
            title="Siri & Sesli Asistan (Mikrofon)"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 45, 85, 0.15) 0%, rgba(175, 82, 222, 0.15) 50%, rgba(10, 132, 255, 0.15) 100%)',
              border: '1px solid rgba(175, 82, 222, 0.35)',
              color: '#af52de',
            }}
          >
            <Mic size={16} />
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

      {/* Day Single Header - Sadece o günün tarihi ve kompakt kontroller */}
      {currentView === 'day' && (
        <div className="day-single-header">
          <div className="day-single-nav">
            <button
              type="button"
              className="day-nav-arrow"
              onClick={() => {
                const [y, m, d] = selectedDate.split('-').map(Number);
                const prev = new Date(y, m - 1, d - 1);
                onSelectDate(formatDateString(prev));
              }}
              title="Önceki Gün"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="day-single-text-group">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="day-single-title">{dateLabels.title}</span>
                {holiday && (
                  <span className="holiday-badge-compact">
                    {holiday.badge} {holiday.name}
                  </span>
                )}
              </div>
              <span className="day-single-subtitle">{dateLabels.subtitle}</span>
            </div>

            <button
              type="button"
              className="day-nav-arrow"
              onClick={() => {
                const [y, m, d] = selectedDate.split('-').map(Number);
                const next = new Date(y, m - 1, d + 1);
                onSelectDate(formatDateString(next));
              }}
              title="Sonraki Gün"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {selectedDate !== formatDateString(new Date()) && (
              <button
                type="button"
                className="today-pill-btn"
                onClick={() => onSelectDate(formatDateString(new Date()))}
              >
                Bugün
              </button>
            )}

            {dayStats.totalTasks > 0 && (
              <div className="progress-pill-compact">
                <Sparkles size={13} />
                <span>{dayStats.completedTasks}/{dayStats.totalTasks} ({completionPercentage}%)</span>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
