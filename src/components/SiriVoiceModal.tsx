import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, MicOff, Check } from 'lucide-react';
import type { Task } from '../types';

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
  const [activeTab, setActiveTab] = useState<'voice' | 'shortcut'>('voice');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      setTranscript('');
      setFeedbackMsg(null);
      return;
    }

    // Auto-start listening when modal opens in voice tab
    if (activeTab === 'voice') {
      startListening();
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isOpen, activeTab]);

  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setFeedbackMsg('Tarayıcınız ses tanımayı desteklemiyor. Lütfen Safari veya Chrome kullanın.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'tr-TR';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
        setTranscript('');
        setFeedbackMsg('Sizi dinliyorum... (Örn: "Saat 14:00\'te Diş Hekimi")');
      };

      recognition.onresult = (event: any) => {
        let text = '';
        for (let i = 0; i < event.results.length; i++) {
          text += event.results[i][0].transcript;
        }
        setTranscript(text);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech error:', event);
        setIsListening(false);
        setFeedbackMsg('Ses algılanamadı, lütfen mikrofona izin verip tekrar deneyin.');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const handleApplyVoice = () => {
    if (!transcript.trim()) return;

    // Parse time
    let title = transcript.trim();
    let time = '10:00';
    let duration = 60;

    const timeMatch = title.match(/(?:saat\s*)?(\d{1,2})(?::(\d{2}))?(?:\s*(?:'|’)?(?:da|de|ta|te|da|de))?/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      if (hours < 7 && !title.toLowerCase().includes('sabah')) {
        hours += 12;
      }
      time = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      title = title.replace(timeMatch[0], '').replace(/saat/gi, '').trim();
    }

    if (!title) title = 'Sesli Görev';

    onAddTask({
      title,
      startTime: time,
      durationMinutes: duration,
      date: selectedDate,
      color: '#0A84FF',
      icon: 'sparkles',
    });

    setFeedbackMsg(`✓ "${title}" saat ${time} için eklendi!`);
    setTimeout(() => {
      onClose();
    }, 900);
  };

  if (!isOpen) return null;

  const roomName = currentRoom || 'tahir';
  const shortcutUrl = `https://asistan-app.vercel.app/api/siri?room=${roomName}&text=`;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-sheet" 
        style={{ maxWidth: 460 }} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title" style={{ fontSize: 17, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>🎙️</span> Siri & Sesli Asistan
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Kapat">
            <X size={18} />
          </button>
        </div>

        {/* Tab switch: Sesle Konuş / Siri Kestirmesi */}
        <div style={{ display: 'flex', background: 'var(--surface-color, rgba(255,255,255,0.06))', padding: 3, borderRadius: 12, margin: '0 20px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('voice')}
            style={{
              flex: 1,
              padding: '6px 12px',
              borderRadius: 9,
              border: 'none',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              background: activeTab === 'voice' ? 'var(--bg-card, #1c1c1e)' : 'transparent',
              color: activeTab === 'voice' ? '#fff' : 'var(--text-secondary)',
              boxShadow: activeTab === 'voice' ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
            }}
          >
            Mikrofonla Söyle
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('shortcut')}
            style={{
              flex: 1,
              padding: '6px 12px',
              borderRadius: 9,
              border: 'none',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              background: activeTab === 'shortcut' ? 'var(--bg-card, #1c1c1e)' : 'transparent',
              color: activeTab === 'shortcut' ? '#fff' : 'var(--text-secondary)',
              boxShadow: activeTab === 'shortcut' ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
            }}
          >
            Apple Siri Kestirmesi 🍎
          </button>
        </div>

        <div className="modal-body" style={{ gap: 16 }}>
          {activeTab === 'voice' ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '10px 0' }}>
              {/* Glowing Siri Orb */}
              <div
                onClick={isListening ? stopListening : startListening}
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: '50%',
                  background: isListening
                    ? 'radial-gradient(circle, #ff2d55 0%, #af52de 50%, #007aff 100%)'
                    : 'radial-gradient(circle, #0A84FF 0%, #0056b3 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: isListening
                    ? '0 0 35px rgba(175, 82, 222, 0.65), 0 0 60px rgba(0, 122, 255, 0.4)'
                    : '0 4px 20px rgba(10, 132, 255, 0.35)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  animation: isListening ? 'pulse 1.5s infinite' : 'none',
                  marginBottom: 16,
                }}
              >
                {isListening ? <Mic size={36} color="#ffffff" /> : <MicOff size={32} color="#ffffff" />}
              </div>

              <div style={{ fontSize: 14, fontWeight: 700, color: isListening ? '#af52de' : 'var(--text-primary)', marginBottom: 6 }}>
                {isListening ? 'Sizi dinliyorum...' : 'Mikrofona dokunup söyleyin'}
              </div>

              {feedbackMsg && (
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
                  {feedbackMsg}
                </div>
              )}

              {/* Transcript Box */}
              <div
                style={{
                  width: '100%',
                  minHeight: 60,
                  backgroundColor: 'var(--surface-color, rgba(255,255,255,0.05))',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 12,
                  padding: 12,
                  fontSize: 14,
                  fontWeight: 600,
                  color: transcript ? 'var(--text-primary)' : 'var(--text-secondary)',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {transcript || 'Örnek: "Saat 15:30\'da Tahir ile toplantı yap"'}
              </div>

              {transcript && (
                <button
                  className="btn btn-primary"
                  onClick={handleApplyVoice}
                  style={{ marginTop: 14, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  <Check size={16} />
                  Takvime Ekle
                </button>
              )}
            </div>
          ) : (
            /* Apple Shortcuts (Kestirmeler) Guide */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
              <div
                style={{
                  background: 'rgba(10, 132, 255, 0.1)',
                  border: '1px solid rgba(10, 132, 255, 0.25)',
                  borderRadius: 12,
                  padding: '12px 16px',
                  lineHeight: 1.5,
                }}
              >
                <strong>"Hey Siri, Asistan'a ekle"</strong> diyerek iPad'inin ekranı kapalıyken bile sesle görev ekleyebilirsin!
              </div>

              <div style={{ lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                <strong>Nasıl Yapılır? (1 Dakika)</strong>
                <ol style={{ paddingLeft: 18, marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <li>iPad'inde <strong>Kestirmeler (Shortcuts)</strong> uygulamasını aç.</li>
                  <li>Yeni bir kestirme oluşturup adını <strong>"Asistan'a Ekle"</strong> yap.</li>
                  <li>İşlem olarak <strong>"Metin İste"</strong> (veya Siri'ye söyle) seç.</li>
                  <li>Ardından <strong>"URL İçeriğini Al"</strong> işlemine şu adresi bağla:</li>
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
                {shortcutUrl}[Girdi Metni]
              </div>

              <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                Artık iPad'ine <em>"Hey Siri, Asistan'a Ekle: Yarın 11'de Diş Randevusu"</em> dediğinde doğrudan takvimine işlenecektir!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
