import React, { useState, useMemo } from 'react';
import { X, CalendarPlus, Copy, Check, Sparkles, AlertCircle } from 'lucide-react';
import type { Task } from '../types';
import { parseTanEvents } from '../utils/tanImporter';

interface ImportTanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportTasks: (newTasks: Task[], skipDuplicates: boolean) => void;
}

export const ImportTanModal: React.FC<ImportTanModalProps> = ({
  isOpen,
  onClose,
  onImportTasks,
}) => {
  const [inputText, setInputText] = useState('');
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  const commandToCopy = 'copy(localStorage.getItem("tan-calendar-v3-confirmed-cache"))';

  const parsedTasks = useMemo(() => {
    return parseTanEvents(inputText);
  }, [inputText]);

  if (!isOpen) return null;

  const handleCopyCommand = async () => {
    try {
      await navigator.clipboard.writeText(commandToCopy);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleExecuteImport = () => {
    if (parsedTasks.length === 0) return;
    onImportTasks(parsedTasks, skipDuplicates);
    setSuccessCount(parsedTasks.length);
    setTimeout(() => {
      setInputText('');
      setSuccessCount(null);
      onClose();
    }, 1800);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-sheet"
        style={{ maxWidth: 520 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title" style={{ fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>🏫</span> Tan Balat Etkinliklerini İçe Aktar
          </div>
          <button type="button" className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Success Banner */}
          {successCount !== null && (
            <div
              style={{
                padding: '14px 16px',
                borderRadius: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: 'rgba(48, 209, 88, 0.15)',
                border: '1px solid rgba(48, 209, 88, 0.4)',
                color: '#30D158',
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              <Check size={22} />
              <span>Harika! {successCount} etkinlik başarıyla Asistan takviminize eklendi 🎉</span>
            </div>
          )}

          {/* Guide Steps Card */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 14,
              background: 'rgba(10, 132, 255, 0.08)',
              border: '1px solid rgba(10, 132, 255, 0.25)',
              fontSize: 13,
              lineHeight: 1.5,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ fontWeight: 700, color: '#0A84FF', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={16} />
              <span>3 Kolay Adımda Tüm Takvimi Çekin:</span>
            </div>
            <div>
              1. <strong>Tan Balat Takvimi</strong> sekmesine geçin.
            </div>
            <div>
              2. Klavyeden <strong>F12</strong> (veya sağ tık ➔ İncele ➔ <strong>Console / Konsol</strong>) açın.
            </div>
            <div>
              3. Aşağıdaki komutu yapıştırıp <strong>Enter</strong>'a basın (tüm etkinlikler anında panonuza kopyalanır):
            </div>

            {/* Code Box */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: 10,
                background: 'rgba(0, 0, 0, 0.35)',
                border: '1px solid var(--border-subtle)',
                marginTop: 4,
                gap: 8,
              }}
            >
              <code style={{ fontSize: 11, fontFamily: 'monospace', color: '#FF9F0A', wordBreak: 'break-all' }}>
                {commandToCopy}
              </code>
              <button
                type="button"
                onClick={handleCopyCommand}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '5px 10px',
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  background: copiedCode ? '#30D158' : 'var(--accent-blue)',
                  color: '#ffffff',
                  flexShrink: 0,
                  transition: 'background 0.2s',
                }}
              >
                {copiedCode ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedCode ? 'Kopyalandı!' : 'Kopyala'}</span>
              </button>
            </div>
          </div>

          {/* Paste Input Area */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              Kopyalanan veriyi buraya yapıştırın:
            </label>
            <textarea
              rows={5}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder='Kopyalanan metni veya JSON verisini buraya yapıştırın (Cmd+V / Ctrl+V)...'
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 12,
                fontSize: 12,
                fontFamily: 'monospace',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-subtle)',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Live Preview info */}
          {inputText.trim() && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 12,
                background: parsedTasks.length > 0 ? 'rgba(48, 209, 88, 0.1)' : 'rgba(255, 69, 58, 0.1)',
                border: `1px solid ${parsedTasks.length > 0 ? 'rgba(48, 209, 88, 0.3)' : 'rgba(255, 69, 58, 0.3)'}`,
                fontSize: 13,
                fontWeight: 600,
                color: parsedTasks.length > 0 ? '#30D158' : '#FF453A',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {parsedTasks.length > 0 ? (
                <>
                  <Check size={16} />
                  <span>
                    ✓ {parsedTasks.length} adet etkinlik algılandı! ({parsedTasks[0].date} — {parsedTasks[parsedTasks.length - 1].date})
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle size={16} />
                  <span>Geçerli bir etkinlik formatı bulunamadı. Lütfen kopyalanan kodu doğru yapıştırdığınızdan emin olun.</span>
                </>
              )}
            </div>
          )}

          {/* Skip duplicates checkbox */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <input
              type="checkbox"
              checked={skipDuplicates}
              onChange={(e) => setSkipDuplicates(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: '#0A84FF' }}
            />
            <span>Mükerrerleri atla (Aynı tarih ve başlıktaki etkinlikleri tekrar ekleme)</span>
          </label>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button
              type="button"
              className="primary-button"
              disabled={parsedTasks.length === 0 || successCount !== null}
              onClick={handleExecuteImport}
              style={{
                flex: 1,
                padding: '13px 18px',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontSize: 14,
                fontWeight: 700,
                background: parsedTasks.length > 0 ? 'linear-gradient(135deg, #0A84FF 0%, #0066CC 100%)' : 'gray',
                cursor: parsedTasks.length > 0 ? 'pointer' : 'not-allowed',
                opacity: parsedTasks.length > 0 ? 1 : 0.6,
              }}
            >
              <CalendarPlus size={16} />
              <span>{parsedTasks.length > 0 ? `${parsedTasks.length} Etkinliği Asistan'a Aktar` : 'Etkinlikleri İçe Aktar'}</span>
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
              style={{
                padding: '13px 18px',
                borderRadius: 12,
                fontSize: 14,
                border: '1px solid var(--border-subtle)',
              }}
            >
              Kapat
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 11, opacity: 0.45 }}>
          Asistan • Tan Balat Entegrasyonu • toe^^
        </div>
      </div>
    </div>
  );
};
