import React, { useState } from 'react';
import { X, Smartphone, Laptop, RefreshCw, Unlink, Sparkles } from 'lucide-react';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRoom: string | null;
  onConnectRoom: (room: string) => Promise<void>;
  onDisconnectRoom: () => void;
  onManualSync: () => Promise<void>;
  lastSyncTime: string | null;
  isSyncing: boolean;
}

export const SyncModal: React.FC<SyncModalProps> = ({
  isOpen,
  onClose,
  currentRoom,
  onConnectRoom,
  onDisconnectRoom,
  onManualSync,
  lastSyncTime,
  isSyncing,
}) => {
  const [roomInput, setRoomInput] = useState(currentRoom || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = roomInput.trim().toLowerCase();
    if (!clean) {
      setErrorMessage('Lütfen bir eşitleme ismi belirleyin.');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await onConnectRoom(clean);
      onClose();
    } catch (err: any) {
      setErrorMessage('Bağlanırken bir sorun oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-sheet" 
        style={{ maxWidth: 460 }} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title" style={{ fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>🔄</span> Cihazlar Arası Eşitleme
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Kapat">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ gap: 20 }}>
          {/* Visual Device Pair Card */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(10, 132, 255, 0.12) 0%, rgba(48, 209, 88, 0.12) 100%)',
              border: '1px solid rgba(10, 132, 255, 0.25)',
              borderRadius: 16,
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-around',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <Laptop size={28} color="#0A84FF" />
              <span style={{ fontSize: 12, fontWeight: 700 }}>Bilgisayar</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#30D158' }}>
              <div style={{ width: 30, height: 2, background: '#30D158', borderRadius: 1 }} />
              <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
              <div style={{ width: 30, height: 2, background: '#30D158', borderRadius: 1 }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <Smartphone size={28} color="#30D158" />
              <span style={{ fontSize: 12, fontWeight: 700 }}>iPad / Tablet</span>
            </div>
          </div>

          {errorMessage && (
            <div
              style={{
                backgroundColor: 'rgba(255, 69, 58, 0.15)',
                border: '1px solid rgba(255, 69, 58, 0.4)',
                borderRadius: 12,
                padding: '10px 14px',
                color: '#ff453a',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {errorMessage}
            </div>
          )}

          {currentRoom ? (
            /* CONNECTED STATE */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div
                style={{
                  background: 'rgba(48, 209, 88, 0.1)',
                  border: '1px solid rgba(48, 209, 88, 0.3)',
                  borderRadius: 14,
                  padding: '14px 18px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Eşitlenen Ortak Kelime:</span>
                  <span
                    style={{
                      background: '#30D158',
                      color: '#000000',
                      padding: '2px 10px',
                      borderRadius: 12,
                      fontWeight: 800,
                      fontSize: 13,
                    }}
                  >
                    {currentRoom}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  iPad'inizde de bu kelimeyi girerek iki cihazın her saniye otomatik güncellenmesini sağlarsınız.
                </div>
                {lastSyncTime && (
                  <div style={{ fontSize: 11, color: '#30D158', marginTop: 8, fontWeight: 600 }}>
                    ✓ Son güncelleme: {lastSyncTime}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className="btn btn-primary"
                  onClick={onManualSync}
                  disabled={isSyncing}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
                  {isSyncing ? 'Eşitleniyor...' : 'Şimdi Eşitle'}
                </button>
                <button
                  className="btn"
                  onClick={onDisconnectRoom}
                  style={{
                    backgroundColor: 'rgba(255, 69, 58, 0.12)',
                    color: '#ff453a',
                    border: '1px solid rgba(255, 69, 58, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                  title="Bağlantıyı Kes"
                >
                  <Unlink size={16} />
                  Ayrıl
                </button>
              </div>
            </div>
          ) : (
            /* NOT CONNECTED STATE */
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>
                  Hiçbir şifre veya hesap olmadan cihazlarınızı bağlayın. Kendinize özel tek bir kelime belirleyin, aynı kelimeyi hem iPad'inize hem bilgisayarınıza yazın.
                </p>

                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
                  ORTAK EŞİTLEME KELİMENİZ
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={roomInput}
                  onChange={(e) => setRoomInput(e.target.value)}
                  placeholder="Örn: tahir veya ajandam"
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoFocus
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    letterSpacing: 0.5,
                  }}
                />
              </div>

              {/* Quick suggestions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Öneri:</span>
                {['tahir', 'asistanim', 'planlarim'].map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setRoomInput(sug)}
                    style={{
                      background: 'var(--surface-color, rgba(255,255,255,0.08))',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 12,
                      padding: '4px 10px',
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                    }}
                  >
                    {sug}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting || !roomInput.trim()}
                style={{
                  padding: '12px 16px',
                  fontWeight: 700,
                  fontSize: 15,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Bağlanıyor...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Cihazları Eşitle
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
