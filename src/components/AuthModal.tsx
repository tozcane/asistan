import React, { useState } from 'react';
import { 
  X, 
  Cloud, 
  CloudCheck, 
  RefreshCw, 
  LogOut, 
  ShieldCheck, 
  Smartphone, 
  Info,
  Check
} from 'lucide-react';
import type { UserProfile, SyncStatus } from '../types';
import { loginWithGoogle, logoutUser } from '../services/authService';
import { isFirebaseConfigured } from '../services/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  syncStatus: SyncStatus;
  lastSyncTime: string | null;
  onForceSync: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  syncStatus,
  lastSyncTime,
  onForceSync,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showFirebaseInfo, setShowFirebaseInfo] = useState(false);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Google ile giriş yapılırken bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await logoutUser();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Çıkış yapılırken bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-sheet" 
        style={{ maxWidth: 460 }} 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title" style={{ fontSize: 20 }}>
            {currentUser ? 'Hesabım & Bulut' : 'Giriş Yap'}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Kapat">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ gap: 20 }}>
          {errorMessage && (
            <div
              style={{
                backgroundColor: 'rgba(255, 69, 58, 0.15)',
                border: '1px solid rgba(255, 69, 58, 0.4)',
                borderRadius: 14,
                padding: '12px 16px',
                color: '#ff453a',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {errorMessage}
            </div>
          )}

          {/* USER LOGGED IN STATE */}
          {currentUser ? (
            <>
              {/* User Profile Card */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  backgroundColor: 'var(--surface-color)',
                  padding: '18px 20px',
                  borderRadius: 18,
                  border: '1px solid var(--border-color)',
                }}
              >
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'Profil'}
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid #0A84FF',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: '50%',
                      backgroundColor: '#0A84FF',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 22,
                      fontWeight: 800,
                    }}
                  >
                    {(currentUser.displayName || currentUser.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 17,
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {currentUser.displayName || 'Google Kullanıcısı'}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: 'var(--text-secondary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      marginTop: 2,
                    }}
                  >
                    {currentUser.email || 'Bağlı Hesap'}
                  </div>
                </div>
              </div>

              {/* Cloud Sync Status Box */}
              <div
                style={{
                  backgroundColor: 'var(--surface-color)',
                  padding: '16px 20px',
                  borderRadius: 18,
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      backgroundColor:
                        syncStatus === 'syncing'
                          ? 'rgba(10, 132, 255, 0.15)'
                          : syncStatus === 'error'
                          ? 'rgba(255, 69, 58, 0.15)'
                          : 'rgba(48, 209, 88, 0.15)',
                      color:
                        syncStatus === 'syncing'
                          ? '#0A84FF'
                          : syncStatus === 'error'
                          ? '#FF453A'
                          : '#30D158',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {syncStatus === 'syncing' ? (
                      <RefreshCw size={20} className="spin-animation" />
                    ) : syncStatus === 'error' ? (
                      <Cloud size={20} />
                    ) : (
                      <CloudCheck size={20} />
                    )}
                  </div>

                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {syncStatus === 'syncing'
                        ? 'Bulutla Eşitleniyor...'
                        : syncStatus === 'error'
                        ? 'Eşitleme Hatası'
                        : 'Bulutta Güvende'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {lastSyncTime ? `Son eşitleme: ${lastSyncTime}` : 'Otomatik yedekleme aktif'}
                    </div>
                  </div>
                </div>

                <button
                  className="icon-btn"
                  onClick={onForceSync}
                  disabled={syncStatus === 'syncing'}
                  title="Şimdi Eşitle"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    width: 36,
                    height: 36,
                  }}
                >
                  <RefreshCw size={16} className={syncStatus === 'syncing' ? 'spin-animation' : ''} />
                </button>
              </div>

              {/* Status Note */}
              <div style={{ fontSize: 13, color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
                {isFirebaseConfigured ? (
                  <span style={{ color: '#30D158' }}>✓ Google Cloud Firestore veritabanına bağlı.</span>
                ) : (
                  <span>
                    💡 Şu an demo modunda bulut simülasyonu çalışıyor. Kendi canlı Firebase projenizi bağlamak için aşağıdaki ayar kartını inceleyebilirsiniz.
                  </span>
                )}
              </div>

              {/* Sign Out Button */}
              <button
                onClick={handleSignOut}
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  borderRadius: 16,
                  border: '1px solid rgba(255, 69, 58, 0.3)',
                  backgroundColor: 'rgba(255, 69, 58, 0.1)',
                  color: '#FF453A',
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'all 0.15s ease',
                }}
              >
                <LogOut size={18} />
                <span>Oturumu Kapat</span>
              </button>
            </>
          ) : (
            /* USER NOT LOGGED IN STATE */
            <>
              <div style={{ textAlign: 'center', padding: '10px 0 6px' }}>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 20,
                    backgroundColor: 'rgba(10, 132, 255, 0.12)',
                    color: '#0A84FF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                  }}
                >
                  <Cloud size={32} />
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>
                  Planlarınızı Buluta Taşıyın
                </div>
                <div
                  style={{
                    fontSize: 14,
                    color: 'var(--text-secondary)',
                    marginTop: 8,
                    lineHeight: 1.5,
                  }}
                >
                  Giriş yaparak günlük akışınızı ve görevlerinizi güvenle yedekleyin, tüm cihazlarınızdan senkronize kalın.
                </div>
              </div>

              {/* Features List */}
              <div
                style={{
                  backgroundColor: 'var(--surface-color)',
                  borderRadius: 18,
                  padding: '16px 20px',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <ShieldCheck size={20} color="#30D158" />
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                    Otomatik ve güvenli bulut yedeklemesi
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Smartphone size={20} color="#0A84FF" />
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                    Farklı bilgisayar ve tarayıcılardan erişim
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Check size={20} color="#FF9F0A" />
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                    İnternet kopsa dahi çevrimdışı çalışma desteği
                  </span>
                </div>
              </div>

              {/* Google Sign-In Button */}
              <button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '16px 20px',
                  borderRadius: 16,
                  border: 'none',
                  backgroundColor: '#ffffff',
                  color: '#1a1a1a',
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
                  transition: 'transform 0.15s ease, opacity 0.15s ease',
                  opacity: isLoading ? 0.7 : 1,
                }}
              >
                {/* Official Google G SVG */}
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>{isLoading ? 'Giriş Yapılıyor...' : 'Google ile Giriş Yap'}</span>
              </button>
            </>
          )}

          {/* Firebase Configuration Info Toggle */}
          <div style={{ marginTop: 8 }}>
            <button
              onClick={() => setShowFirebaseInfo(!showFirebaseInfo)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-tertiary)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 0',
                margin: '0 auto',
              }}
            >
              <Info size={14} />
              <span>{showFirebaseInfo ? 'Canlı Firebase Bilgisini Gizle' : 'Canlı Firebase Kurulumu Hakkında'}</span>
            </button>

            {showFirebaseInfo && (
              <div
                style={{
                  marginTop: 10,
                  padding: '14px 16px',
                  backgroundColor: 'var(--surface-color)',
                  borderRadius: 14,
                  border: '1px solid var(--border-color)',
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5,
                }}
              >
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                  Gerçek Firebase Projenizi Bağlama:
                </div>
                Proje kök dizinindeki <code>.env</code> dosyasına kendi Firebase Authentication & Firestore bilgilerinizi ekleyebilirsiniz:
                <pre
                  style={{
                    backgroundColor: '#000000',
                    padding: 10,
                    borderRadius: 8,
                    marginTop: 8,
                    overflowX: 'auto',
                    fontSize: 11,
                    color: '#FF9F0A',
                  }}
                >
{`VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_id
VITE_FIREBASE_APP_ID=your_app_id`}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
