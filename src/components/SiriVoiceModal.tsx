import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, MicOff, Check, Calendar, Clock, Sparkles, Send, Loader2 } from 'lucide-react';
import type { Task } from '../types';
import { parseConversationalText, type ParsedAITask } from '../services/aiService';

interface SiriVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTasks: (tasks: Array<Omit<Task, 'id' | 'completed'>>) => void;
  selectedDate: string;
  currentRoom: string | null;
}

export const SiriVoiceModal: React.FC<SiriVoiceModalProps> = ({
  isOpen,
  onClose,
  onAddTasks,
  selectedDate,
  currentRoom,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [parsedTasks, setParsedTasks] = useState<ParsedAITask[]>([]);
  const [activeTab, setActiveTab] = useState<'voice' | 'text' | 'shortcut'>('voice');
  const [statusMessage, setStatusMessage] = useState<string>('Sizi dinliyorum...');
  const [isSaved, setIsSaved] = useState(false);
  const [aiSource, setAiSource] = useState<'gemini' | 'fallback' | null>(null);

  const recognitionRef = useRef<any>(null);
  const autoCommitTimerRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const isSavedRef = useRef(false);
  const shouldListenRef = useRef(false);
  const latestTranscriptRef = useRef('');

  useEffect(() => {
    if (!isOpen) {
      shouldListenRef.current = false;
      isSavedRef.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      clearTimeout(autoCommitTimerRef.current);
      clearTimeout(silenceTimerRef.current);
      setIsListening(false);
      setTranscript('');
      setTextInput('');
      setParsedTasks([]);
      setIsSaved(false);
      setIsAnalyzing(false);
      setAiSource(null);
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
      clearTimeout(autoCommitTimerRef.current);
      clearTimeout(silenceTimerRef.current);
    };
  }, [isOpen, activeTab]);

  const handleProcessSpeech = async (speechText: string) => {
    if (!speechText.trim() || isAnalyzing || isSavedRef.current) return;
    
    setIsAnalyzing(true);
    setStatusMessage('Yapay zeka planınızı analiz ediyor... 🧠');

    try {
      const result = await parseConversationalText(speechText, selectedDate);
      if (result.tasks && result.tasks.length > 0) {
        setParsedTasks(result.tasks);
        setAiSource(result.source);
        setIsAnalyzing(false);
        setStatusMessage(
          result.source === 'gemini'
            ? `✨ Gemini Yapay Zeka ${result.tasks.length} görev çıkardı`
            : `✓ ${result.tasks.length} görev algılandı`
        );

        // Auto-save after 3.5s if not manually saved
        clearTimeout(autoCommitTimerRef.current);
        autoCommitTimerRef.current = setTimeout(() => {
          if (!isSavedRef.current) {
            handleCommitTasks(result.tasks);
          }
        }, 4000);
      } else {
        setIsAnalyzing(false);
        setStatusMessage('Cümlenizden bir görev çıkarılamadı. Tekrar deneyin.');
      }
    } catch {
      setIsAnalyzing(false);
      setStatusMessage('Bir hata oluştu, lütfen tekrar söyleyin.');
    }
  };

  const handleCommitTasks = (tasksToCommit: ParsedAITask[]) => {
    if (tasksToCommit.length === 0 || isSavedRef.current) return;
    isSavedRef.current = true;
    shouldListenRef.current = false;
    setIsSaved(true);

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    clearTimeout(autoCommitTimerRef.current);
    clearTimeout(silenceTimerRef.current);

    const formattedTasks = tasksToCommit.map((t) => ({
      title: t.title,
      startTime: t.time,
      durationMinutes: t.durationMinutes,
      date: t.date,
      color: t.color || '#0A84FF',
      icon: t.icon || 'sparkles',
    }));

    onAddTasks(formattedTasks);
    setStatusMessage(`✓ ${formattedTasks.length} görev takviminize eklendi!`);

    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setStatusMessage('Tarayıcınız ses tanımayı desteklemiyor. "Metinle Yaz" sekmesini kullanabilirsiniz.');
      return;
    }

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'tr-TR';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
        setStatusMessage('Sizi dinliyorum, günlük dilde rahatça konuşun...');
      };

      recognition.onresult = (event: any) => {
        let text = '';
        for (let i = 0; i < event.results.length; i++) {
          text += event.results[i][0].transcript;
        }
        setTranscript(text);
        latestTranscriptRef.current = text;

        if (text.trim().length > 3) {
          clearTimeout(silenceTimerRef.current);
          setStatusMessage('Dinliyorum... (Cümleniz bitince yapay zeka çözecek)');

          // 3.5 seconds silence trigger
          silenceTimerRef.current = setTimeout(() => {
            if (!isSavedRef.current && latestTranscriptRef.current.trim().length > 3) {
              handleProcessSpeech(latestTranscriptRef.current);
            }
          }, 3500);
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'no-speech') return;
        console.error('Speech error:', event);
      };

      recognition.onend = () => {
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
    clearTimeout(silenceTimerRef.current);
    if (latestTranscriptRef.current.trim().length > 3) {
      handleProcessSpeech(latestTranscriptRef.current);
    }
  };

  const handleManualTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || isAnalyzing) return;
    handleProcessSpeech(textInput);
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
          <div className="modal-title" style={{ fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>🧠</span> Yapay Zeka & Siri Asistanı
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Kapat">
            <X size={16} />
          </button>
        </div>

        {/* Tab Switcher */}
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
              transition: 'all 0.2s ease',
            }}
          >
            🎙️ Sesle Konuş
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('text')}
            style={{
              flex: 1,
              padding: '6px 10px',
              borderRadius: 9,
              border: 'none',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              background: activeTab === 'text' ? 'var(--bg-card, #1c1c1e)' : 'transparent',
              color: activeTab === 'text' ? '#fff' : 'var(--text-secondary)',
              transition: 'all 0.2s ease',
            }}
          >
            ✍️ Doğal Dille Yaz
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
              transition: 'all 0.2s ease',
            }}
          >
            🍎 Hey Siri
          </button>
        </div>

        <div className="modal-body" style={{ gap: 14 }}>
          {/* TAB 1: VOICE MODE */}
          {activeTab === 'voice' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              {/* Animated Siri Orb */}
              <div
                onClick={isListening ? stopListening : startListening}
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: isSaved
                    ? '#30D158'
                    : isAnalyzing
                    ? 'radial-gradient(circle, #5e5ce6 0%, #bf5af2 50%, #ff375f 100%)'
                    : isListening
                    ? 'radial-gradient(circle, #ff2d55 0%, #af52de 50%, #007aff 100%)'
                    : 'radial-gradient(circle, #0A84FF 0%, #0056b3 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: isSaved
                    ? '0 0 30px rgba(48, 209, 88, 0.6)'
                    : isAnalyzing
                    ? '0 0 40px rgba(191, 90, 242, 0.7)'
                    : isListening
                    ? '0 0 35px rgba(175, 82, 222, 0.6), 0 0 50px rgba(0, 122, 255, 0.4)'
                    : '0 4px 18px rgba(10, 132, 255, 0.35)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  marginBottom: 12,
                  animation: isAnalyzing || isListening ? 'pulse 2s infinite' : 'none',
                }}
              >
                {isSaved ? (
                  <Check size={38} color="#ffffff" strokeWidth={3} />
                ) : isAnalyzing ? (
                  <Loader2 size={36} color="#ffffff" className="animate-spin" />
                ) : isListening ? (
                  <Mic size={32} color="#ffffff" />
                ) : (
                  <MicOff size={28} color="#ffffff" />
                )}
              </div>

              <div style={{ fontSize: 13, fontWeight: 700, color: isSaved ? '#30D158' : isListening ? '#af52de' : 'var(--text-primary)', marginBottom: 6 }}>
                {statusMessage}
              </div>

              {/* Spoken Text Area */}
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
                  marginBottom: 6,
                }}
              >
                {transcript || 'Örnek: "Dostum yarın öğleden sonra 3 gibi Tahirle kahve içeriz, akşam 7\'de de spora giderim."'}
              </div>

              {/* Action Buttons if user wants to analyze immediately */}
              {transcript && !isAnalyzing && parsedTasks.length === 0 && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleProcessSpeech(transcript)}
                  style={{
                    padding: '8px 16px',
                    fontSize: 12,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    borderRadius: 10,
                  }}
                >
                  <Sparkles size={14} /> Yapay Zeka ile Analiz Et
                </button>
              )}
            </div>
          )}

          {/* TAB 2: NATURAL LANGUAGE TEXT INPUT */}
          {activeTab === 'text' && (
            <form onSubmit={handleManualTextSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Tıpkı ChatGPT veya arkadaşınızla konuşur gibi dilediğiniz gibi yazın. Yapay zeka tüm tarih, saat ve görevleri otomatik ayıklar:
              </div>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder='Örn: "Yarın öğleden sonra 3 te Tahirle buluşup kahve içeriz, sonra akşam 7 de eve geçip biraz ders çalışmam lazım, pazar sabahı da 10 da koşu var."'
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: 'var(--surface-color, rgba(255,255,255,0.05))',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  fontFamily: 'inherit',
                  resize: 'none',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={!textInput.trim() || isAnalyzing}
                className="btn btn-primary"
                style={{
                  padding: '10px 16px',
                  fontSize: 13,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  opacity: !textInput.trim() || isAnalyzing ? 0.6 : 1,
                }}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Yapay Zeka Anlıyor...
                  </>
                ) : (
                  <>
                    <Send size={15} /> Yapay Zeka ile Çöz ve Planla ✨
                  </>
                )}
              </button>
            </form>
          )}

          {/* EXTRACTED TASKS DISPLAY (For both voice and text!) */}
          {parsedTasks.length > 0 && (
            <div
              style={{
                width: '100%',
                background: 'rgba(10, 132, 255, 0.08)',
                border: '1px solid rgba(10, 132, 255, 0.25)',
                borderRadius: 14,
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Sparkles size={13} color="#0A84FF" />
                  {aiSource === 'gemini' ? 'GEMİNİ YAPAY ZEKA ÇÖZÜMLEMESİ' : 'ALGILANAN GÖREVLER'} ({parsedTasks.length})
                </span>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#30D158', background: 'rgba(48,209,88,0.15)', padding: '2px 8px', borderRadius: 8 }}>
                  {isSaved ? 'Takvime Eklendi ✓' : 'Birazdan otomatik eklenir'}
                </span>
              </div>

              {/* Tasks List Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 180, overflowY: 'auto' }}>
                {parsedTasks.map((task, i) => (
                  <div
                    key={i}
                    style={{
                      background: 'var(--bg-card, #1c1c1e)',
                      border: '1px solid var(--border-subtle)',
                      borderLeft: `4px solid ${task.color || '#0A84FF'}`,
                      borderRadius: 10,
                      padding: '8px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>
                      {task.title}
                    </div>
                    <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Calendar size={12} color="#0A84FF" /> {task.date}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} color="#FF9F0A" /> {task.time} ({task.durationMinutes} dk)
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {!isSaved && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleCommitTasks(parsedTasks)}
                  style={{
                    padding: '8px 14px',
                    fontSize: 13,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    borderRadius: 10,
                  }}
                >
                  <Check size={16} /> Hemen Takvime Ekle
                </button>
              )}
            </div>
          )}

          {/* TAB 3: APPLE SHORTCUTS GUIDE */}
          {activeTab === 'shortcut' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12, lineHeight: 1.5 }}>
              <div
                style={{
                  background: 'rgba(10, 132, 255, 0.1)',
                  border: '1px solid rgba(10, 132, 255, 0.25)',
                  borderRadius: 12,
                  padding: '10px 14px',
                }}
              >
                🧠 <strong>Artık Siri de Yapay Zeka ile Güçlendirildi!</strong>
                <br />
                iPad'inize serbestçe konuştuğunuzda Siri arkaplanda Gemini yapay zekasını çalıştırır ve birden fazla görevi dahi tek seferde takviminize işler.
              </div>

              <div>
                <strong>iPad'de 1 Kez Yapılacak Kurulum:</strong>
                <ol style={{ paddingLeft: 18, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <li>iPad'de <strong>Kestirmeler (Shortcuts)</strong> uygulamasını aç.</li>
                  <li>Yeni kestirme oluştur ve adını <strong>"Asistan'a Ekle"</strong> yap.</li>
                  <li>İşlem 1: <strong>"Girdi İste"</strong> (Metin sor: "Planınız nedir?")</li>
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
                Örnek konuşma: <em>"Hey Siri, Asistan'a ekle: Yarın öğleden sonra 3'te Tahirle kahve içeceğiz, akşam da 7'de spora gideceğim."</em>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
