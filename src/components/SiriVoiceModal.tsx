import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, MicOff, Check, Calendar, Clock } from 'lucide-react';
import type { Task } from '../types';
import { parseTurkishVoiceInput, type ParsedSchedule } from '../utils/siriParser';

interface SiriVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (task: Omit<Task, 'id' | 'completed'>) => void;
  selectedDate: string;
  currentRoom: string | null;
}

export const SiriVoiceModal: React.FC<SiriVoiceModalProps> = ({
  isOpen,
  onClose,
  onAddTask,
  selectedDate,
  currentRoom,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [preview, setPreview] = useState<ParsedSchedule | null>(null);
  const [activeTab, setActiveTab] = useState<'voice' | 'shortcut'>('voice');
  const [statusMessage, setStatusMessage] = useState<string>('Sizi dinliyorum...');
  const [isSaved, setIsSaved] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const autoSaveTimerRef = useRef<any>(null);
  const isSavedRef = useRef(false);
  const shouldListenRef = useRef(false);
  const currentParsedRef = useRef<ParsedSchedule | null>(null);

  useEffect(() => {
    if (!isOpen) {
      shouldListenRef.current = false;
      isSavedRef.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      clearTimeout(autoSaveTimerRef.current);
      setIsListening(false);
      setTranscript('');
      setPreview(null);
      setIsSaved(false);
      return;
    }

    isSavedRef.current = false;
    shouldListenRef.current = true;

    if (activeTab === 'voice') {
      startListening();
    }

    return () => {
      shouldListenRef.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      clearTimeout(autoSaveTimerRef.current);
    };
  }, [isOpen, activeTab]);

  const autoCommit = (parsed: ParsedSchedule) => {
    if (!parsed.title || isSavedRef.current) return;
    isSavedRef.current = true;
    shouldListenRef.current = false;
    setIsSaved(true);
    setStatusMessage(`✓ Kuruldu: "${parsed.title}" (${parsed.date} saat ${parsed.time})`);

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    clearTimeout(autoSaveTimerRef.current);
    
    onAddTask({
      title: parsed.title,
      startTime: parsed.time,
      durationMinutes: parsed.durationMinutes,
      date: parsed.date,
      color: '#0A84FF',
      icon: 'sparkles',
    });

    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setStatusMessage('Tarayıcınız ses tanımayı desteklemiyor. Safari veya Chrome kullanın.');
      return;
    }

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'tr-TR';
      recognition.continuous = true; // KESİNLİKLE KAPANMAZ, SÜREKLİ DİNLER
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
        setStatusMessage('Sizi dinliyorum, rahatça konuşun...');
      };

      recognition.onresult = (event: any) => {
        let text = '';
        for (let i = 0; i < event.results.length; i++) {
          text += event.results[i][0].transcript;
        }
        setTranscript(text);

        if (text.trim().length > 2) {
          const parsed = parseTurkishVoiceInput(text, selectedDate);
          setPreview(parsed);
          currentParsedRef.current = parsed;

          // Uzun sessizlik süresi: 4 tam saniye susarsa otomatik kaydeder
          clearTimeout(autoSaveTimerRef.current);
          setStatusMessage('Dinliyorum... (Susunca 4 sn sonra otomatik kurulur)');
          
          autoSaveTimerRef.current = setTimeout(() => {
            if (!isSavedRef.current && currentParsedRef.current) {
              autoCommit(currentParsedRef.current);
            }
          }, 4000);
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'no-speech') {
          // Sessizlikte hemen kapanmasın, dinlemeye devam etsin
          return;
        }
        console.error('Speech error:', event);
      };

      recognition.onend = () => {
        // Kullanıcı henüz kaydetmediyse ve modal açıksa otomatik olarak dinlemeye devam et
        if (shouldListenRef.current && !isSavedRef.current) {
          try {
            recognition.start();
            setIsListening(true);
          } catch {
            setIsListening(false);
          }
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
    } catch (e) {
      console.error(e);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    shouldListenRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    setIsListening(false);
    setStatusMessage('Dinleme duraklatıldı. Mikrofona basarak devam edebilirsiniz.');
  };

  if (!isOpen) return null;

  const roomName = currentRoom || 'tahir';
  const shortcutUrl = `https://asistan-app.vercel.app/api/siri?room=${roomName}&text=`;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-sheet" 
        style={{ maxWidth: 440 }} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title" style={{ fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>🎙️</span> Siri & Sesli Asistan
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Kapat">
            <X size={16} />
          </button>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', background: 'var(--surface-color, rgba(255,255,255,0.06))', padding: 3, borderRadius: 12, margin: '0 18px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('voice')}
            style={{
              flex: 1,
              padding: '6px 10px',
              borderRadius: 9,
              border: 'none',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              background: activeTab === 'voice' ? 'var(--bg-card, #1c1c1e)' : 'transparent',
              color: activeTab === 'voice' ? '#fff' : 'var(--text-secondary)',
            }}
          >
            Mikrofonla Söyle
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('shortcut')}
            style={{
              flex: 1,
              padding: '6px 10px',
              borderRadius: 9,
              border: 'none',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              background: activeTab === 'shortcut' ? 'var(--bg-card, #1c1c1e)' : 'transparent',
              color: activeTab === 'shortcut' ? '#fff' : 'var(--text-secondary)',
            }}
          >
            "Hey Siri" Kestirmesi 🍎
          </button>
        </div>

        <div className="modal-body" style={{ gap: 14 }}>
          {activeTab === 'voice' ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              {/* Siri Orb */}
              <div
                onClick={isListening ? stopListening : startListening}
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: '50%',
                  background: isSaved
                    ? '#30D158'
                    : isListening
                    ? 'radial-gradient(circle, #ff2d55 0%, #af52de 50%, #007aff 100%)'
                    : 'radial-gradient(circle, #0A84FF 0%, #0056b3 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: isSaved
                    ? '0 0 30px rgba(48, 209, 88, 0.6)'
                    : isListening
                    ? '0 0 35px rgba(175, 82, 222, 0.6), 0 0 50px rgba(0, 122, 255, 0.4)'
                    : '0 4px 18px rgba(10, 132, 255, 0.35)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  marginBottom: 12,
                }}
              >
                {isSaved ? (
                  <Check size={36} color="#ffffff" strokeWidth={3} />
                ) : isListening ? (
                  <Mic size={32} color="#ffffff" />
                ) : (
                  <MicOff size={28} color="#ffffff" />
                )}
              </div>

              <div style={{ fontSize: 13, fontWeight: 700, color: isSaved ? '#30D158' : isListening ? '#af52de' : 'var(--text-primary)', marginBottom: 4 }}>
                {statusMessage}
              </div>

              {/* Transcript & Instant Parsed Preview */}
              <div
                style={{
                  width: '100%',
                  minHeight: 52,
                  backgroundColor: 'var(--surface-color, rgba(255,255,255,0.05))',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 12,
                  padding: '10px 14px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: transcript ? 'var(--text-primary)' : 'var(--text-secondary)',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: 8,
                }}
              >
                {transcript || 'Örnek: "Yarın saat 15:30\'da Diş Randevusu"'}
              </div>

              {/* Auto-detected Date & Time Card */}
              {preview && (
                <div
                  style={{
                    width: '100%',
                    background: 'rgba(10, 132, 255, 0.1)',
                    border: '1px solid rgba(10, 132, 255, 0.25)',
                    borderRadius: 12,
                    padding: '10px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>
                      ALGILANAN GÖREV
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#30D158', background: 'rgba(48,209,88,0.15)', padding: '2px 6px', borderRadius: 6 }}>
                      {isSaved ? 'Kuruldu ✓' : 'Uzun susarsanız otomatik kurulur'}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>
                    {preview.title}
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Calendar size={13} color="#0A84FF" /> {preview.date}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={13} color="#FF9F0A" /> {preview.time}
                    </span>
                  </div>

                  {!isSaved && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => autoCommit(preview)}
                      style={{
                        marginTop: 6,
                        padding: '8px 12px',
                        fontSize: 13,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                      }}
                    >
                      <Check size={15} /> Beklemeden Hemen Kur
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Apple Siri Shortcuts Setup */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12, lineHeight: 1.5 }}>
              <div
                style={{
                  background: 'rgba(10, 132, 255, 0.1)',
                  border: '1px solid rgba(10, 132, 255, 0.25)',
                  borderRadius: 12,
                  padding: '10px 14px',
                }}
              >
                Ekrana hiç basmadan, iPad'ine <strong>"Hey Siri, Asistan'a ekle"</strong> diyerek arka planda takvimine görev ekleyebilirsin!
              </div>

              <div>
                <strong>iPad'de 1 Kez Yapılacak Kurulum:</strong>
                <ol style={{ paddingLeft: 18, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <li>iPad'de <strong>Kestirmeler (Shortcuts)</strong> uygulamasını aç.</li>
                  <li>Yeni kestirme oluştur ve adını <strong>"Asistan'a Ekle"</strong> yap.</li>
                  <li>İşlem 1: <strong>"Girdi İste"</strong> (Metin sor: "Göreviniz nedir?")</li>
                  <li>İşlem 2: <strong>"URL'nin İçeriğini Al"</strong> ekle ve şu adresi yaz:</li>
                </ol>
              </div>

              <div
                style={{
                  background: '#000000',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 10,
                  padding: '8px 12px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  wordBreak: 'break-all',
                  color: '#30D158',
                }}
              >
                {shortcutUrl}[Sağlanan Girdi]
              </div>

              <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                Artık iPad'ine <em>"Hey Siri, Asistan'a ekle: Yarın saat 15:00'te Diş Hekimi"</em> dediğinde Siri otomatik olarak tarihi, saati ve konuyu takvime işler!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
