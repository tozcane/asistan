import React, { useState, useRef, useEffect } from 'react';
import { Clock, ChevronDown, Check } from 'lucide-react';

interface TimeSelect15Props {
  label: string;
  value: string; // HH:mm
  onChange: (timeStr: string) => void;
  color?: string;
}

// Generate all 96 fifteen-minute intervals in a 24-hour day (00:00, 00:15, ..., 23:45)
const FIFTEEN_MINUTE_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 15) {
    FIFTEEN_MINUTE_OPTIONS.push(
      `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
    );
  }
}

export const TimeSelect15: React.FC<TimeSelect15Props> = ({
  label,
  value,
  onChange,
  color = '#0A84FF',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep internal input value synchronized with value prop
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Scroll to selected time item when dropdown opens
  useEffect(() => {
    if (isOpen && listRef.current) {
      const activeEl = listRef.current.querySelector('[data-selected="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'center' });
      }
    }
  }, [isOpen]);

  // Keyboard input handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    if (/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(val)) {
      onChange(val);
    }
  };

  const handleInputBlur = () => {
    // If entered time doesn't match HH:mm, revert to current valid value
    if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(inputValue)) {
      setInputValue(value);
    }
  };

  const handleSelect = (timeStr: string) => {
    onChange(timeStr);
    setInputValue(timeStr);
    setIsOpen(false);
  };

  return (
    <div className="time-select-15" ref={containerRef} style={{ position: 'relative' }}>
      <label
        style={{
          display: 'block',
          fontSize: 13,
          fontWeight: 700,
          color: 'var(--text-secondary)',
          marginBottom: 6,
        }}
      >
        {label}
      </label>

      {/* Main Clickable Input Box that opens downwards */}
      <div
        onClick={() => {
          setIsOpen(!isOpen);
          inputRef.current?.focus();
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'var(--surface-color)',
          border: isOpen ? `2px solid ${color}` : '1px solid var(--border-color)',
          borderRadius: 14,
          padding: '10px 14px',
          gap: 10,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          boxShadow: isOpen ? `0 0 12px ${color}30` : 'none',
        }}
      >
        <Clock size={17} color={isOpen ? color : 'var(--text-secondary)'} />

        {/* Keyboard-editable text input */}
        <input
          ref={inputRef}
          type="text"
          maxLength={5}
          placeholder="09:00"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onFocus={() => setIsOpen(true)}
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setIsOpen(false);
            }
          }}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text-primary)',
            fontSize: 16,
            fontWeight: 800,
            fontFamily: 'inherit',
            letterSpacing: 0.5,
            cursor: 'text',
          }}
        />

        {/* Downwards Dropdown Chevron Indicator */}
        <ChevronDown
          size={18}
          style={{
            color: isOpen ? color : 'var(--text-secondary)',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Downwards-opening 15-Minute Dropdown Menu */}
      {isOpen && (
        <div
          ref={listRef}
          className="time-dropdown-white"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            zIndex: 200,
            maxHeight: 240,
            overflowY: 'auto',
            backgroundColor: '#ffffff',
            border: '1px solid rgba(0, 0, 0, 0.12)',
            borderRadius: 16,
            padding: '6px',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.35)',
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
          }}
        >
          {FIFTEEN_MINUTE_OPTIONS.map((timeOption) => {
            const isSelected = timeOption === value;
            return (
              <button
                key={timeOption}
                type="button"
                data-selected={isSelected}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(timeOption);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: isSelected ? `1.5px solid ${color}` : '1.5px solid transparent',
                  backgroundColor: isSelected ? `${color}20` : 'transparent',
                  color: '#000000',
                  fontSize: 15,
                  fontWeight: isSelected ? 800 : 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background-color 0.12s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.06)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span style={{ color: '#000000', fontWeight: isSelected ? 800 : 600 }}>
                  {timeOption}
                </span>
                {isSelected && <Check size={16} strokeWidth={3} color={color} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
