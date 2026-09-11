import React, { useRef, useState, useEffect } from 'react';
import { PenTool, FileText, RotateCcw, Trash2, Eraser, ShieldCheck } from 'lucide-react';

interface DailyNotesProps {
  selectedDate: string;
}

const PEN_COLORS = [
  { id: 'default', label: 'Varsayılan', light: '#000000', dark: '#FFFFFF' },
  { id: 'blue', label: 'Mavi', hex: '#0A84FF' },
  { id: 'red', label: 'Kırmızı', hex: '#FF453A' },
  { id: 'yellow', label: 'Sarı', hex: '#FFD60A' },
  { id: 'green', label: 'Yeşil', hex: '#30D158' },
];

export const DailyNotes: React.FC<DailyNotesProps> = ({ selectedDate }) => {
  const [textContent, setTextContent] = useState<string>('');
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
    const colorObj = PEN_COLORS.find((c) => c.id === selectedColor);
    if (!colorObj) return isDarkMode ? '#FFFFFF' : '#000000';
    if (colorObj.hex) return colorObj.hex;
    return (isDarkMode ? colorObj.dark : colorObj.light) || '#000000';
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Palm Rejection: Tuvalde sadece kalem ucu (ve masaüstü fare) çizim yapar, el ayası çizmez
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

    let width = isEraser ? 24 : 2.5;
    if (!isEraser && e.pointerType === 'pen' && typeof e.pressure === 'number' && e.pressure > 0) {
      width = Math.max(1.2, Math.min(5.5, 2.5 * (0.6 + e.pressure * 0.9)));
    }

    strokePointsRef.current = [{ x: coords.x, y: coords.y, width }];

    ctx.save();
    // Gerçek silgi: destination-out ile doğrudan pikselleri şeffaflaştırarak siler, asla boyamaz
    if (isEraser) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.fillStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = getStrokeColor();
      ctx.fillStyle = getStrokeColor();
    }
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

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
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = getStrokeColor();
    }
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 0; i < rawEvents.length; i++) {
      const ev = rawEvents[i];
      const coords = getCanvasCoords(ev.clientX, ev.clientY);

      let width = isEraser ? 24 : 2.5;
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
      {/* Header with Title & Tools */}
      <div className="daily-notes-header">
        <div className="daily-notes-title-group">
          <div className="daily-notes-title">
            <PenTool size={17} color="#FF9F0A" />
            <span>Günün Notları</span>
          </div>
          <span className="daily-notes-subtitle desktop-only">Metin notları ve Apple Pencil el yazısı alanı</span>
        </div>

        {/* Toolbar Controls */}
        <div className="daily-notes-controls">
          <div className="daily-notes-pen-tools">
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

            {/* True Eraser */}
            <button
              type="button"
              className={`icon-btn-compact ${isEraser ? 'active' : ''}`}
              onClick={() => setIsEraser(!isEraser)}
              title="Silgi (Çizilen mürekkebi siler)"
            >
              <Eraser size={14} />
              <span className="desktop-only" style={{ fontSize: 11, fontWeight: 700 }}>Silgi</span>
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
          <div className="notes-section-header">
            <PenTool size={14} color="#FF9F0A" />
            <span>Apple Pencil ile Çizim & El Yazısı</span>
            <span className="notes-palm-indicator">
              <ShieldCheck size={13} color="#30D158" />
              <span>Avuç İçi Korumalı</span>
            </span>
          </div>

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
                  <span>Apple Pencil veya parmakla serbestçe buraya not alın & çizin</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
