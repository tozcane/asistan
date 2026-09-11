import React, { useRef, useState, useEffect } from 'react';
import { PenTool, FileText, RotateCcw, Trash2, Eraser, ShieldCheck } from 'lucide-react';

interface DailyNotesProps {
  selectedDate: string;
}

export type PenStyle = 'pilot' | 'fountain' | 'marker' | 'highlighter';
export type PenSize = 'thin' | 'medium' | 'thick' | 'xlarge';

const PEN_STYLES: { id: PenStyle; label: string; icon: string; title: string }[] = [
  { id: 'pilot', label: 'Pilot', icon: '🖊️', title: 'Pilot Kalem (İnce ve net)' },
  { id: 'fountain', label: 'Dolma Kalem', icon: '✒️', title: 'Dolma Kalem (Baskıya duyarlı hat)' },
  { id: 'marker', label: 'İspirtolu', icon: '🖍️', title: 'İspirtolu Kalem (Doygun ve kalın)' },
  { id: 'highlighter', label: 'Fosforlu', icon: '✨', title: 'Fosforlu Kalem (Şeffaf vurgulayıcı)' },
];

const PEN_SIZES: { id: PenSize; label: string; dotSize: number }[] = [
  { id: 'thin', label: 'İnce', dotSize: 4 },
  { id: 'medium', label: 'Normal', dotSize: 7 },
  { id: 'thick', label: 'Kalın', dotSize: 10 },
  { id: 'xlarge', label: 'Ekstra', dotSize: 14 },
];

const STANDARD_COLORS = [
  { id: 'default', label: 'Siyah/Beyaz', light: '#000000', dark: '#FFFFFF' },
  { id: 'blue', label: 'Mavi', hex: '#0A84FF' },
  { id: 'red', label: 'Kırmızı', hex: '#FF453A' },
  { id: 'green', label: 'Yeşil', hex: '#30D158' },
  { id: 'purple', label: 'Mor', hex: '#BF5AF2' },
  { id: 'orange', label: 'Turuncu', hex: '#FF9F0A' },
];

const HIGHLIGHTER_COLORS = [
  { id: 'hl-green', label: 'Fosforlu Yeşil', hex: '#39FF14' },
  { id: 'hl-yellow', label: 'Fosforlu Sarı', hex: '#FFE600' },
  { id: 'hl-pink', label: 'Fosforlu Pembe', hex: '#FF2D55' },
  { id: 'hl-blue', label: 'Fosforlu Mavi', hex: '#00E5FF' },
  { id: 'hl-orange', label: 'Fosforlu Turuncu', hex: '#FF9500' },
];

export const DailyNotes: React.FC<DailyNotesProps> = ({ selectedDate }) => {
  const [textContent, setTextContent] = useState<string>('');
  const [penStyle, setPenStyle] = useState<PenStyle>('pilot');
  const [penSize, setPenSize] = useState<PenSize>('medium');
  const [selectedColor, setSelectedColor] = useState<string>('default');
  const [isEraser, setIsEraser] = useState<boolean>(false);

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

  // Switch pen style helper
  const handleSelectPenStyle = (style: PenStyle) => {
    setPenStyle(style);
    setIsEraser(false);
    if (style === 'highlighter') {
      if (!selectedColor.startsWith('hl-')) {
        setSelectedColor('hl-green'); // Default to Fosforlu Yeşil
      }
    } else {
      if (selectedColor.startsWith('hl-')) {
        setSelectedColor('default');
      }
    }
  };

  // Setup / resize and restore canvas for selectedDate
  const restoreCanvas = (force = false) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const width = Math.floor(rect.width) || 320;
    const height = Math.floor(rect.height) || 360;

    const dpr = window.devicePixelRatio || 1;
    if (!force && canvas.width === width * dpr && canvas.height === height * dpr) {
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
    restoreCanvas(true);
  }, [selectedDate]);

  // Prevent drawing cancel on minor resize
  useEffect(() => {
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const handleResize = () => {
      if (isDrawingRef.current) return;
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        if (!container || !canvas) return;
        const rect = container.getBoundingClientRect();
        const width = Math.floor(rect.width);
        const height = Math.floor(rect.height);
        const dpr = window.devicePixelRatio || 1;
        if (Math.abs(canvas.width - width * dpr) > 25 || Math.abs(canvas.height - height * dpr) > 25) {
          saveCanvasState();
          restoreCanvas(true);
        }
      }, 150);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimer) clearTimeout(resizeTimer);
    };
  }, [selectedDate]);

  // Prevent page scrolling strictly while pencil is drawing on the canvas
  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (isDrawingRef.current) {
        e.preventDefault();
      }
    };
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => window.removeEventListener('touchmove', handleTouchMove);
  }, []);

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
    const colors = penStyle === 'highlighter' ? HIGHLIGHTER_COLORS : STANDARD_COLORS;
    const colorObj = colors.find((c) => c.id === selectedColor);
    if (!colorObj) {
      if (penStyle === 'highlighter') return '#39FF14';
      return isDarkMode ? '#FFFFFF' : '#000000';
    }
    if ('hex' in colorObj && colorObj.hex) return colorObj.hex;
    return (isDarkMode ? (colorObj as any).dark : (colorObj as any).light) || '#000000';
  };

  const getBaseWidth = (): number => {
    const sizeMap: Record<PenStyle, Record<PenSize, number>> = {
      pilot: { thin: 1.5, medium: 2.5, thick: 4.0, xlarge: 6.0 },
      fountain: { thin: 2.0, medium: 3.5, thick: 5.5, xlarge: 8.0 },
      marker: { thin: 4.0, medium: 6.5, thick: 9.5, xlarge: 14.0 },
      highlighter: { thin: 16.0, medium: 24.0, thick: 32.0, xlarge: 42.0 },
    };
    return sizeMap[penStyle][penSize];
  };

  const getComputedWidth = (pressure?: number): number => {
    if (isEraser) return 26;
    const base = getBaseWidth();
    if (typeof pressure === 'number' && pressure > 0) {
      if (penStyle === 'fountain') {
        // Dolma Kalem: Dramatic calligraphic tapering
        return Math.max(1.0, base * (0.35 + pressure * 1.6));
      } else if (penStyle === 'pilot') {
        // Pilot Kalem: Smooth, crisp line
        return Math.max(0.9, base * (0.8 + pressure * 0.35));
      } else if (penStyle === 'marker') {
        // İspirtolu Kalem: Bold, rich marker
        return Math.max(2.5, base * (0.7 + pressure * 0.6));
      } else if (penStyle === 'highlighter') {
        // Fosforlu Kalem: Wide highlighter sweep
        return Math.max(10, base * (0.85 + pressure * 0.25));
      }
    }
    return base;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Palm Rejection: Tuvalde sadece kalem ucu (ve masaüstü fare) çizim yapar
    if (e.pointerType === 'touch') {
      e.preventDefault();
      return;
    }

    if (activePointerIdRef.current !== null) {
      e.preventDefault();
      return;
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
    const width = getComputedWidth(e.pressure);

    strokePointsRef.current = [{ x: coords.x, y: coords.y, width }];

    ctx.save();
    if (isEraser) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.fillStyle = 'rgba(0,0,0,1)';
      ctx.globalAlpha = 1.0;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    } else if (penStyle === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = getStrokeColor();
      ctx.fillStyle = getStrokeColor();
      ctx.globalAlpha = 0.38; // Şeffaf fosforlu vurgulayıcı
      ctx.lineCap = 'square';
      ctx.lineJoin = 'miter';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = getStrokeColor();
      ctx.fillStyle = getStrokeColor();
      ctx.globalAlpha = 1.0;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
    ctx.lineWidth = width;

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

    const nativeEv = e.nativeEvent as unknown as { getCoalescedEvents?: () => globalThis.PointerEvent[] };
    const coalesced = nativeEv?.getCoalescedEvents ? nativeEv.getCoalescedEvents() : [];
    const rawEvents = coalesced && coalesced.length > 0 ? coalesced : [e];

    ctx.save();
    if (isEraser) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.globalAlpha = 1.0;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    } else if (penStyle === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = getStrokeColor();
      ctx.globalAlpha = 0.38;
      ctx.lineCap = 'square';
      ctx.lineJoin = 'miter';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = getStrokeColor();
      ctx.globalAlpha = 1.0;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }

    for (let i = 0; i < rawEvents.length; i++) {
      const ev = rawEvents[i];
      const coords = getCanvasCoords(ev.clientX, ev.clientY);
      const width = getComputedWidth(ev.pressure);

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

  const activeColors = penStyle === 'highlighter' ? HIGHLIGHTER_COLORS : STANDARD_COLORS;

  return (
    <div className="daily-notes-container">
      {/* Header with Title & Action Buttons */}
      <div className="daily-notes-header">
        <div className="daily-notes-title-group">
          <div className="daily-notes-title">
            <PenTool size={17} color="#FF9F0A" />
            <span>Günün Notları</span>
          </div>
          <span className="daily-notes-subtitle desktop-only">Metin notları ve Apple Pencil el yazısı alanı</span>
        </div>

        {/* Action buttons (Undo, Clear) */}
        <div className="daily-notes-header-actions">
          <button
            type="button"
            className="icon-btn-compact"
            onClick={handleUndo}
            title="Geri Al"
          >
            <RotateCcw size={14} />
            <span className="desktop-only" style={{ fontSize: 11, fontWeight: 700 }}>Geri Al</span>
          </button>

          <button
            type="button"
            className="icon-btn-compact text-danger"
            onClick={handleClearCanvas}
            title="Tüm Çizimi Temizle"
          >
            <Trash2 size={14} />
            <span className="desktop-only" style={{ fontSize: 11, fontWeight: 700 }}>Temizle</span>
          </button>
        </div>
      </div>

      {/* Unified Sections on the Same Page: Text + Pencil Drawing together */}
      <div className="daily-notes-unified-body">
        {/* 1. Text Notes Section */}
        <div className="daily-notes-text-card">
          <div className="notes-section-header">
            <FileText size={14} color="#0A84FF" />
            <span>Klavyeyle Metin Notu</span>
          </div>
          <textarea
            className="daily-notes-textarea"
            value={textContent}
            onChange={handleTextChange}
            placeholder="Günün önemli notları, maddeleri ve fikirleri..."
            rows={3}
          />
        </div>

        {/* 2. Apple Pencil Drawing & Handwriting Canvas Section */}
        <div className="daily-notes-canvas-card">
          <div className="notes-section-header-row">
            <div className="notes-section-header">
              <PenTool size={14} color="#FF9F0A" />
              <span>Apple Pencil Çizim & El Yazısı</span>
              <span className="notes-palm-indicator">
                <ShieldCheck size={13} color="#30D158" />
                <span>Avuç Korumalı</span>
              </span>
            </div>

            {/* Pen Style Selector Tabs (Pilot, Dolma, İspirtolu, Fosforlu) */}
            <div className="pen-styles-bar">
              {PEN_STYLES.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  className={`pen-style-tab ${penStyle === style.id && !isEraser ? 'active' : ''}`}
                  onClick={() => handleSelectPenStyle(style.id)}
                  title={style.title}
                >
                  <span className="pen-icon">{style.icon}</span>
                  <span className="pen-label">{style.label}</span>
                </button>
              ))}

              {/* True Eraser Tab */}
              <button
                type="button"
                className={`pen-style-tab eraser-tab ${isEraser ? 'active' : ''}`}
                onClick={() => setIsEraser(!isEraser)}
                title="Silgi (Çizilen mürekkebi siler)"
              >
                <Eraser size={13} />
                <span className="pen-label">Silgi</span>
              </button>
            </div>
          </div>

          {/* Sub-toolbar: Thickness selector & Color palette */}
          <div className="daily-notes-pen-subbar">
            {/* Thickness (Kalınlık / İncelik) Selector */}
            <div className="pen-size-picker-group">
              <span className="picker-label desktop-only">Kalınlık:</span>
              <div className="pen-sizes-row">
                {PEN_SIZES.map((sz) => (
                  <button
                    key={sz.id}
                    type="button"
                    className={`pen-size-btn ${penSize === sz.id && !isEraser ? 'selected' : ''}`}
                    onClick={() => {
                      setPenSize(sz.id);
                      setIsEraser(false);
                    }}
                    title={sz.label}
                  >
                    <span
                      className="size-dot-inner"
                      style={{ width: sz.dotSize, height: sz.dotSize }}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Colors Palette */}
            {!isEraser && (
              <div className="pen-colors-picker-group">
                <span className="picker-label desktop-only">Renk:</span>
                <div className="pen-colors-row">
                  {activeColors.map((c) => {
                    const colorCode = 'hex' in c && c.hex ? c.hex : (isDarkMode ? (c as any).dark : (c as any).light);
                    const isSelected = selectedColor === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        className={`pen-color-dot ${isSelected ? 'selected' : ''}`}
                        style={{ backgroundColor: colorCode }}
                        onClick={() => setSelectedColor(c.id)}
                        title={c.label}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Canvas Box */}
          <div className="daily-notes-content-box" ref={containerRef}>
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
                    {penStyle === 'highlighter'
                      ? 'Fosforlu vurgulayıcı ile serbestçe çiz & vurgula'
                      : penStyle === 'fountain'
                      ? 'Dolma kalem ile kaligrafik yazı yaz & çiz'
                      : 'Apple Pencil veya parmakla serbestçe not alın & çizin'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
