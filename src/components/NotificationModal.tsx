import React, { useState, useEffect } from 'react';
import { X, Bell, BellRing, BellOff, CheckCircle2, Smartphone, Volume2, Sparkles } from 'lucide-react';
import { getNotificationStatus, requestNotificationPermission, testNotification } from '../utils/notifications';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({ isOpen, onClose }) => {
  const [status, setStatus] = useState(() => getNotificationStatus());
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStatus(getNotificationStatus());
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleEnableNotifications = async () => {
    const perm = await requestNotificationPermission();
    setStatus(getNotificationStatus());
    if (perm === 'granted') {
      setTestResult('Bildirim izni verildi! Test bildirimi gönderiliyor...');
      await testNotification();
      setTestResult('Harika! Bildirimler bu cihazda başarıyla aktif edildi 🎉');
    } else if (perm === 'denied') {
      setTestResult('Bildirim izni reddedildi. Lütfen tarayıcı/cihaz ayarlarından izin verin.');
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const ok = await testNotification();
      if (ok) {
        setTestResult('Test bildirimi, ses ve titreşim gönderildi! 🔔✨');
      } else {
        setTestResult('Bildirim izni verilmediği için sadece ses çalındı.');
      }
    } catch {
      setTestResult('Test sırasında bir hata oluştu.');
    } finally {
      setIsTesting(false);
    }
  };

  const isGranted = status.permission === 'granted';
  const isDenied = status.permission === 'denied';
  const isIOSBrowser = status.isIOS && !status.isStandalone;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-sheet"
        style={{ maxWidth: 460 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title" style={{ fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>🔔</span> Cihaz Bildirimleri
          </div>
          <button type="button" className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Status Banner */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: isGranted
                ? 'rgba(48, 209, 88, 0.12)'
                : isDenied
                ? 'rgba(255, 69, 58, 0.12)'
                : 'rgba(255, 159, 10, 0.12)',
              border: `1px solid ${
                isGranted
                  ? 'rgba(48, 209, 88, 0.3)'
                  : isDenied
                  ? 'rgba(255, 69, 58, 0.3)'
                  : 'rgba(255, 159, 10, 0.3)'
              }`,
            }}
          >
            <div style={{ flexShrink: 0 }}>
              {isGranted ? (
                <CheckCircle2 size={24} color="#30D158" />
              ) : isDenied ? (
                <BellOff size={24} color="#FF453A" />
              ) : (
                <BellRing size={24} color="#FF9F0A" />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 14,
                  color: isGranted ? '#30D158' : isDenied ? '#FF453A' : '#FF9F0A',
                }}
              >
                {isGranted
                  ? 'Bildirimler Bu Cihazda Aktif'
                  : isDenied
                  ? 'Bildirim İzni Engellenmiş'
                  : 'Bildirim İzni Henüz Verilmedi'}
              </div>
              <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2, lineHeight: 1.35 }}>
                {isGranted
                  ? 'Görev saatlerinde ve sabah özetlerinde telefon/tabletiniz çalacak ve bildirim gelecektir.'
                  : isDenied
                  ? 'Tarayıcı veya cihaz ayarlarından Asistan için bildirimlere izin vermeniz gerekiyor.'
                  : 'Görev başlangıçlarını kaçırmamak için bildirimleri aktif edin.'}
              </div>
            </div>
          </div>

          {/* Test or Feedback message */}
          {testResult && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                textAlign: 'center',
                background: 'rgba(10, 132, 255, 0.12)',
                color: '#0A84FF',
                border: '1px solid rgba(10, 132, 255, 0.25)',
              }}
            >
              {testResult}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {!isGranted ? (
              <button
                type="button"
                className="primary-button"
                style={{
                  padding: '12px 18px',
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  fontSize: 14,
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #0A84FF 0%, #0066CC 100%)',
                }}
                onClick={handleEnableNotifications}
              >
                <Bell size={16} />
                <span>Bildirimleri Etkinleştir</span>
              </button>
            ) : (
              <button
                type="button"
                className="secondary-button"
                style={{
                  padding: '12px 18px',
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  border: '1px solid var(--border-subtle)',
                }}
                onClick={handleTest}
                disabled={isTesting}
              >
                <Volume2 size={16} />
                <span>{isTesting ? 'Gönderiliyor...' : '🔔 Bildirim & Ses Testi Yap'}</span>
              </button>
            )}
          </div>

          {/* iPhone & iPad Specific Guidance */}
          {status.isIOS && (
            <div
              style={{
                marginTop: 4,
                padding: '14px 16px',
                borderRadius: 14,
                background: isIOSBrowser ? 'rgba(255, 159, 10, 0.08)' : 'rgba(10, 132, 255, 0.06)',
                border: isIOSBrowser
                  ? '1.5px dashed rgba(255, 159, 10, 0.4)'
                  : '1px solid var(--border-subtle)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontWeight: 700,
                  fontSize: 13,
                  color: isIOSBrowser ? '#FF9F0A' : 'var(--text-primary)',
                  marginBottom: 6,
                }}
              >
                <Smartphone size={16} />
                <span>iPhone & iPad Kullanıcıları İçin Bilgi</span>
              </div>

              {isIOSBrowser ? (
                <div style={{ fontSize: 12, lineHeight: 1.45, opacity: 0.9 }}>
                  <p style={{ margin: '0 0 6px 0' }}>
                    Apple (iOS / iPadOS), Safari tarayıcı sekmelerinde doğrudan kilit ekranı bildirimlerini kısıtlar. Bildirimlerin tam çalışması için:
                  </p>
                  <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <li>
                      Safari'nin altındaki <strong>Paylaş (⬆️)</strong> butonuna dokunun.
                    </li>
                    <li>
                      Açılan menüde <strong>"Ana Ekrana Ekle"</strong> seçeneğine tıklayın.
                    </li>
                    <li>
                      Ana ekranınızdaki <strong>Asistan</strong> simgesinden uygulamayı açıp buradan bildirimleri aktif edin.
                    </li>
                  </ol>
                </div>
              ) : (
                <div style={{ fontSize: 12, lineHeight: 1.4, opacity: 0.85, color: '#30D158' }}>
                  ✓ Uygulama Ana Ekrana eklenmiş durumda! Bildirimler kilit ekranınıza ve bildirim merkezine sorunsuz düşecektir.
                </div>
              )}
            </div>
          )}

          {/* Features info */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 12,
              background: 'var(--bg-card-hover)',
              fontSize: 12,
              lineHeight: 1.4,
              opacity: 0.85,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-primary)' }}>
              <Sparkles size={13} color="#0A84FF" />
              <span>Bildirim Özellikleri:</span>
            </div>
            <div>• ⏰ <strong>Görev Zamanı:</strong> Planlanan görevin başlangıç saatinde anlık uyarı.</div>
            <div>• ☀️ <strong>Sabah Özeti:</strong> Sabah ilk girişte günün planı ve toplam süre özeti.</div>
            <div>• 🔔 <strong>Ses & Titreşim:</strong> Mobil cihazlarda zil sesi ve titreşim desteği.</div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 11, opacity: 0.45 }}>
          Asistan • toe^^
        </div>
      </div>
    </div>
  );
};
