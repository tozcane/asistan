import React, { useRef, useState, useEffect } from 'react';
import { PenTool, FileText, RotateCcw, Trash2, Eraser, ShieldCheck } from 'lucide-react';

interface DailyNotesProps {
  selectedDate: string;
}

type NoteMode = 'pen' | 'text';

const PEN_COLORS = [
  { id: 'default', label: 'Varsayılan', light: '#000000', dark: '#FFFFFF' },
  { id: 'blue', label: 'Mavi', hex: '#0A84FF' },
  { id: 'red', label: 'Kırmızı', hex: '#FF453A' },
  { id: 'yellow', label: 'Sarı', hex: '#FFD60A' },
  { id: 'green', label: 'Yeşil', hex: '#30D158' },
];

export const DailyNotes: React.FC<DailyNotesProps> = ({ selectedDate }) => {
  const [mode, setMode] = useState<NoteMode>('pen');
  const [textContent, setTextContent] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('default');
  const [isEraser, setIsEraser] = useState<boolean>(false);
  const [penOnlyMode, setPenOnlyMode] = useState<boolean>(true); // Avuç içi reddi varsayılan olarak açık

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const activePointerIdRef = useRef<number | null>(null);
  const strokePointsRef = useRef<{ x: number; y: number; width: number }[]>([]);
  const historyRef = useRef<ImageData[]>([]);

  const isDarkMode = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark';

  // Load saved text notes for selected date
  useEffect(() => {
    const saved = localStorage.getItem(`asistan_note_${selectedDate}`) || '';
    setTextContent(saved);
  }, [selectedDate]);

  // Save text notes
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setTextContent(val);
    localStorage.setItem(`asistan_note_${selectedDate}`, val);
  };

  const saveCanvasState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL();
    localStorage.setItem(`asistan_canvas_${selectedDate}`, dataUrl);
  };

  // Setup / resize and restore canvas for selectedDate
  const restoreCanvas = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const width = Math.floor(rect.width) || 320;
    const height = Math.floor(rect.height) || 380;

    const dpr = window.devicePixelRatio || 1;
    // Don't re-initialize canvas if already matching dimension
    if (canvas.width === width * dpr && canvas.height === height * dpr) {
      return;
    }

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Clear history on date change
    historyRef.current = [];

    // Load saved drawing image
    const savedDrawing = localStorage.getItem(`asistan_canvas_${selectedDate}`);
    if (savedDrawing) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
      };
      img.src = savedDrawing;
    }
  };

  useEffect(() => {
    if (mode === 'pen') {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      restoreCanvas();
    }
  }, [selectedDate, mode]);

  // Window resize handler with auto-save and debouncing (never wipe while drawing)
  useEffect(() => {
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const handleResize = () => {
      if (mode !== 'pen' || isDrawingRef.current) return;
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        if (!container || !canvas) return;
        const rect = container.getBoundingClientRect();
        const width = Math.floor(rect.width);
        const height = Math.floor(rect.height);
        const dpr = window.devicePixelRatio || 1;
        // Only restore if width or height changed significantly (e.g. orientation flip)
        if (Math.abs(canvas.width - width * dpr) > 20 || Math.abs(canvas.height - height * dpr) > 20) {
          saveCanvasState();
          restoreCanvas();
        }
      }, 150);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimer) clearTimeout(resizeTimer);
    };
  }, [selectedDate, mode]);

  // Sayfa Geneli Avuç İçi Reddi (Global Palm Rejection across the ENTIRE website)
  useEffect(() => {
    if (mode !== 'pen' || !penOnlyMode) {
      document.body.classList.remove('pen-mode-active');
      return;
    }

    document.body.classList.add('pen-mode-active');

    // 1. Pointer events capture: Sadece parmak/avuç dokunuşlarını sayfanın her yerinde bloke et
    const handleGlobalPointer = (e: PointerEvent) => {
      if (e.pointerType === 'touch') {
        const target = e.target as HTMLElement | null;
        if (target?.closest('.allow-finger-touch')) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    };

    // 2. Touch events capture: Sayfanın istemsiz kaymasını, buton tıklamalarını ve klavye açılmasını engelle
    const handleGlobalTouch = (e: TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('.allow-finger-touch')) {
        return;
      }
      // Kalemle çizim yapılırken el/avuç ekrana değdiğinde (1 veya çoklu nokta) tamamen engelle
      if (isDrawingRef.current) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return;
      }
      // Tek parmak / avuç temasını engelle (2 parmakla sayfa kaydırmaya izin ver)
      if (e.touches.length === 1) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    };

    window.addEventListener('pointerdown', handleGlobalPointer, { capture: true, passive: false });
    window.addEventListener('pointermove', handleGlobalPointer, { capture: true, passive: false });
    window.addEventListener('pointerup', handleGlobalPointer, { capture: true, passive: false });
    window.addEventListener('pointercancel', handleGlobalPointer, { capture: true, passive: false });

    window.addEventListener('touchstart', handleGlobalTouch, { capture: true, passive: false });
    window.addEventListener('touchmove', handleGlobalTouch, { capture: true, passive: false });
    window.addEventListener('touchend', handleGlobalTouch, { capture: true, passive: false });
    window.addEventListener('touchcancel', handleGlobalTouch, { capture: true, passive: false });

    return () => {
      document.body.classList.remove('pen-mode-active');
      window.removeEventListener('pointerdown', handleGlobalPointer, { capture: true });
      window.removeEventListener('pointermove', handleGlobalPointer, { capture: true });
      window.removeEventListener('pointerup', handleGlobalPointer, { capture: true });
      window.removeEventListener('pointercancel', handleGlobalPointer, { capture: true });

      window.removeEventListener('touchstart', handleGlobalTouch, { capture: true });
      window.removeEventListener('touchmove', handleGlobalTouch, { capture: true });
      window.removeEventListener('touchend', handleGlobalTouch, { capture: true });
      window.removeEventListener('touchcancel', handleGlobalTouch, { capture: true });
    };
  }, [mode, penOnlyMode]);

  const getCanvasCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const getStrokeColor = (): string => {
    if (isEraser) {
      return isDarkMode ? '#1c1c1e' : '#ffffff';
    }
    const colorObj = PEN_COLORS.find((c) => c.id === selectedColor);
    if (!colorObj) return isDarkMode ? '#FFFFFF' : '#000000';
    if (colorObj.hex) return colorObj.hex;
    return (isDarkMode ? colorObj.dark : colorObj.light) || '#000000';
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // 1. AVUÇ İÇİ KORUMASI: Sadece Kalem modu açıkken parmak/avuç dokunuşlarını YÜZDE YÜZ reddet
    if (penOnlyMode && e.pointerType === 'touch') {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // 2. Halihazırda çizim yapan bir pointer varken ikinci dokunuşu (avuç dayama) reddet
    if (activePointerIdRef.current !== null) {
      e.preventDefault();
      return;
    }

    // 3. Klavyenin açılmasını kesin olarak engelle
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    activePointerIdRef.current = e.pointerId;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Undo snapshot
    try {
      const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
      if (historyRef.current.length > 20) historyRef.current.shift();
      historyRef.current.push(snap);
    } catch {
      // ignore
    }

    isDrawingRef.current = true;
    const coords = getCanvasCoords(e.clientX, e.clientY);

    // Apple Pencil basınç duyarlılığı (yazı yazmaya uygun 1.2px - 5.5px aralığı)
    let width = isEraser ? 22 : 2.5;
    if (!isEraser && e.pointerType === 'pen' && typeof e.pressure === 'number' && e.pressure > 0) {
      width = Math.max(1.2, Math.min(5.5, 2.5 * (0.6 + e.pressure * 0.9)));
    }

    strokePointsRef.current = [{ x: coords.x, y: coords.y, width }];

    ctx.save();
    ctx.strokeStyle = getStrokeColor();
    ctx.fillStyle = getStrokeColor();
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Nokta atışı (tek dokunma)
    ctx.beginPath();
    ctx.arc(coords.x, coords.y, width / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || activePointerIdRef.current !== e.pointerId) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Apple Pencil 120Hz/240Hz coalesced events
    const nativeEv = e.nativeEvent as unknown as { getCoalescedEvents?: () => globalThis.PointerEvent[] };
    const coalesced = nativeEv?.getCoalescedEvents ? nativeEv.getCoalescedEvents() : [];
    const rawEvents = coalesced && coalesced.length > 0 ? coalesced : [e];

    ctx.save();
    ctx.strokeStyle = getStrokeColor();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 0; i < rawEvents.length; i++) {
      const ev = rawEvents[i];
      const coords = getCanvasCoords(ev.clientX, ev.clientY);

      let width = isEraser ? 22 : 2.5;
      if (!isEraser && ev.pointerType === 'pen' && typeof ev.pressure === 'number' && ev.pressure > 0) {
        width = Math.max(1.2, Math.min(5.5, 2.5 * (0.6 + ev.pressure * 0.9)));
      }

      const pts = strokePointsRef.current;
      pts.push({ x: coords.x, y: coords.y, width });

      if (pts.length >= 3) {
        const p0 = pts[pts.length - 2];
        const p1 = pts[pts.length - 1];
        const midX = (p0.x + p1.x) / 2;
        const midY = (p0.y + p1.y) / 2;

        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.quadraticCurveTo(p0.x, p0.y, midX, midY);
        ctx.stroke();
      } else if (pts.length === 2) {
        const p0 = pts[0];
        const p1 = pts[1];
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }
    }

    ctx.restore();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    isDrawingRef.current = false;
    activePointerIdRef.current = null;
    strokePointsRef.current = [];

    const canvas = canvasRef.current;
    if (canvas) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
    saveCanvasState();
  };

  const handleUndo = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || historyRef.current.length === 0) return;

    const last = historyRef.current.pop();
    if (last) {
      ctx.putImageData(last, 0, 0);
      saveCanvasState();
    }
  };

  const handleClearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    localStorage.removeItem(`asistan_canvas_${selectedDate}`);
    historyRef.current = [];
  };

  return (
    <div className="daily-notes-container">
      {/* Global Palm Rejection Notice Banner */}
      {mode === 'pen' && penOnlyMode && (
        <div className="pen-active-global-banner">
          <div className="banner-left">
            <span className="banner-pulse" />
            <span>
              ✍️ <strong>Sadece Kalem Modu:</strong> Sayfanın her yerinde avuç koruması devrede. Sayfaya yalnızca Apple Pencil dokunabilir.
            </span>
          </div>
          <button
            type="button"
            className="banner-switch-btn allow-finger-touch"
            onClick={() => setPenOnlyMode(false)}
            title="Parmakla dokunmayı aç"
          >
            🖐️ Parmak Dokunuşunu Aç
          </button>
        </div>
      )}

      {/* Header with Title & Mode Switcher */}
      <div className="daily-notes-header">
        <div className="daily-notes-title-group">
          <div className="daily-notes-title">
            <PenTool size={16} color="#FF9F0A" />
            <span>Günün Notları</span>
          </div>
          <span className="daily-notes-subtitle desktop-only">Kalemle çiz veya klavyeyle yaz</span>
        </div>

        <div className="daily-notes-controls">
          {/* Mode Switcher Tabs */}
          <div className="daily-notes-mode-tabs">
            <button
              type="button"
              className={`notes-tab-btn allow-finger-touch ${mode === 'pen' ? 'active' : ''}`}
              onClick={() => {
                setMode('pen');
                setIsEraser(false);
                if (document.activeElement instanceof HTMLElement) {
                  document.activeElement.blur();
                }
              }}
              title="Kalemle Çizim & El Yazısı Modu"
            >
              <PenTool size={13} />
              <span>Kalem</span>
            </button>
            <button
              type="button"
              className={`notes-tab-btn allow-finger-touch ${mode === 'text' ? 'active' : ''}`}
              onClick={() => setMode('text')}
              title="Metin / Klavye Notu Modu"
            >
              <FileText size={13} />
              <span>Metin</span>
            </button>
          </div>

          {/* Pen Toolbar Controls */}
          {mode === 'pen' && (
            <div className="daily-notes-pen-tools">
              {/* Palm Rejection Toggle */}
              <button
                type="button"
                className={`notes-palm-btn allow-finger-touch ${penOnlyMode ? 'active' : ''}`}
                onClick={() => setPenOnlyMode(!penOnlyMode)}
                title={penOnlyMode ? 'Avuç İçi Koruması Açık: Sadece Kalem Ucu Yazar' : 'Parmakla Çizim Açık'}
              >
                <ShieldCheck size={13} />
                <span className="desktop-only">{penOnlyMode ? 'Sadece Kalem (Avuç Koruması)' : 'Kalem + Parmak'}</span>
                <span className="mobile-only">{penOnlyMode ? 'Sadece Kalem' : 'Parmak'}</span>
              </button>

              {/* Color dots */}
              <div className="pen-colors-row">
                {PEN_COLORS.map((c) => {
                  const colorCode = c.hex || (isDarkMode ? c.dark : c.light);
                  const isSelected = selectedColor === c.id && !isEraser;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      className={`pen-color-dot ${isSelected ? 'selected' : ''}`}
                      style={{ backgroundColor: colorCode }}
                      onClick={() => {
                        setSelectedColor(c.id);
                        setIsEraser(false);
                      }}
                      title={c.label}
                    />
                  );
                })}
              </div>

              {/* Eraser */}
              <button
                type="button"
                className={`icon-btn-compact ${isEraser ? 'active' : ''}`}
                onClick={() => setIsEraser(!isEraser)}
                title="Silgi"
              >
                <Eraser size={14} />
              </button>

              {/* Undo */}
              <button
                type="button"
                className="icon-btn-compact"
                onClick={handleUndo}
                title="Geri Al"
              >
                <RotateCcw size={14} />
              </button>

              {/* Clear */}
              <button
                type="button"
                className="icon-btn-compact text-danger"
                onClick={handleClearCanvas}
                title="Çizimi Temizle"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content Area: Canvas or Textarea */}
      <div className="daily-notes-content-box" ref={containerRef}>
        {mode === 'pen' ? (
          <div className="canvas-wrapper">
            <canvas
              ref={canvasRef}
              className="daily-notes-canvas"
              tabIndex={-1}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            />
            {!localStorage.getItem(`asistan_canvas_${selectedDate}`) && (
              <div className="canvas-watermark">
                <PenTool size={22} strokeWidth={1.5} />
                <span>
                  {penOnlyMode
                    ? 'Apple Pencil ile serbestçe yaz & çiz (Avuç koruması aktif)'
                    : 'Kalem veya parmakla serbestçe yaz & çiz'}
                </span>
              </div>
            )}
          </div>
        ) : (
          <textarea
            className="daily-notes-textarea"
            value={textContent}
            onChange={handleTextChange}
            placeholder="Günün notları, hedefleri ve fikirleri..."
            rows={7}
          />
        )}
      </div>
    </div>
  );
};
