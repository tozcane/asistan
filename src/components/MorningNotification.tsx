import React from 'react';
import { Sun, Clock, ArrowRight, X } from 'lucide-react';
import type { Task } from '../types';
import { formatDuration } from '../utils/time';

interface MorningNotificationProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  dateStr: string;
}

export const MorningNotification: React.FC<MorningNotificationProps> = ({
  isOpen,
  onClose,
  tasks,
}) => {
  if (!isOpen) return null;

  const scheduledTasks = tasks
    .filter((t) => !t.inInbox && t.startTime)
    .sort((a, b) => (a.startTime! > b.startTime! ? 1 : -1));

  const totalMinutes = scheduledTasks.reduce(
    (acc, t) => acc + (t.durationMinutes || 0),
    0
  );

  const firstTask = scheduledTasks.length > 0 ? scheduledTasks[0] : null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-sheet"
        style={{
          maxWidth: 440,
          background: 'linear-gradient(180deg, #1f1d24 0%, #161618 100%)',
          border: '1px solid rgba(255, 159, 10, 0.3)',
          boxShadow: '0 20px 60px rgba(255, 159, 10, 0.2)',
          overflow: 'hidden',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Soft Sunrise Glow Backdrop */}
        <div
          style={{
            position: 'absolute',
            top: -60,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 220,
            height: 140,
            background: 'radial-gradient(circle, rgba(255, 159, 10, 0.35) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Close Icon */}
        <button
          className="icon-btn"
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            zIndex: 10,
            width: 32,
            height: 32,
          }}
          onClick={onClose}
        >
          <X size={16} />
        </button>

        <div style={{ padding: '32px 24px 20px', textAlign: 'center' }}>
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 159, 10, 0.15)',
              border: '2px solid rgba(255, 159, 10, 0.4)',
              color: '#ff9f0a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 0 25px rgba(255, 159, 10, 0.4)',
            }}
          >
            <Sun size={32} />
          </div>

          <div
            style={{
              fontSize: 13,
              fontWeight: 800,
              textTransform: 'uppercase',
              color: '#ff9f0a',
              letterSpacing: 1.5,
              marginBottom: 4,
            }}
          >
            GÜNAYDIN! ☀️
          </div>

          <div
            style={{
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: -0.5,
              color: '#ffffff',
              marginBottom: 8,
            }}
          >
            Bugünkü Planın Hazır
          </div>

          <p
            style={{
              fontSize: 15,
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
              maxWidth: 320,
              margin: '0 auto',
            }}
          >
            {scheduledTasks.length > 0
              ? `Bugün seni bekleyen ${scheduledTasks.length} görev var. Harika ve verimli bir gün olsun!`
              : 'Bugün için henüz bir görev planlamadın. Gününü şimdi planlayabilirsin.'}
          </p>
        </div>

        {/* Daily Highlights Box */}
        {scheduledTasks.length > 0 && (
          <div
            style={{
              margin: '0 24px 20px',
              padding: '14px 18px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: 16,
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={14} /> Toplam Süre
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#ffffff' }}>
                {formatDuration(totalMinutes)}
              </span>
            </div>

            {firstTask && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  paddingTop: 10,
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div
                  style={{
                    width: 4,
                    height: 24,
                    borderRadius: 2,
                    backgroundColor: firstTask.color,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>
                    İLK GÖREV ({firstTask.startTime})
                  </div>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: '#ffffff',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {firstTask.title}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Button */}
        <div style={{ padding: '0 24px 24px' }}>
          <button
            className="add-task-btn"
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '14px 0',
              background: 'linear-gradient(135deg, #ff9f0a 0%, #ff453a 100%)',
              boxShadow: '0 6px 20px rgba(255, 159, 10, 0.4)',
            }}
            onClick={onClose}
          >
            <span>Güne Başla</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
