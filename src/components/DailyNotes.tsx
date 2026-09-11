import React, { useRef, useState, useEffect } from 'react';
import { PenTool, FileText, RotateCcw, Trash2, Eraser } from 'lucide-react';

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
  const penSize = 3;
  const [isEraser, setIsEraser] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
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

  // Setup / resize and restore canvas for selectedDate
  const restoreCanvas = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const width = Math.floor(rect.width) || 320;
    const height = Math.floor(rect.height) || 280;

    const dpr = window.devicePixelRatio || 1;
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
      restoreCanvas();
    }
  }, [selectedDate, mode]);

  // Window resize handler
  useEffect(() => {
    const handleResize = () => {
      if (mode === 'pen') {
        restoreCanvas();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [selectedDate, mode]);

  // Drawing event handlers supporting Apple Pencil & Touch & Mouse
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
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

  const saveCanvasState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL();
    localStorage.setItem(`asistan_canvas_${selectedDate}`, dataUrl);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Save history for undo
    try {
      const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
      if (historyRef.current.length > 15) historyRef.current.shift();
      historyRef.current.push(snap);
    } catch {
      // ignore
    }

    isDrawingRef.current = true;
    const coords = getCanvasCoords(e);
    lastPosRef.current = coords;

    ctx.beginPath();
    ctx.strokeStyle = getStrokeColor();

    // Apple Pencil pressure sensitivity
    let width = penSize;
    if (e.pointerType === 'pen' && e.pressure && e.pressure > 0) {
      width = Math.max(1.5, penSize * e.pressure * 1.6);
    }
    if (isEraser) width = penSize * 4;

    ctx.lineWidth = width;
    ctx.moveTo(coords.x, coords.y);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !lastPosRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const coords = getCanvasCoords(e);

    ctx.beginPath();
    ctx.strokeStyle = getStrokeColor();

    let width = penSize;
    if (e.pointerType === 'pen' && e.pressure && e.pressure > 0) {
      width = Math.max(1.5, penSize * e.pressure * 1.6);
    }
    if (isEraser) width = penSize * 4;

    ctx.lineWidth = width;
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();

    lastPosRef.current = coords;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastPosRef.current = null;
    const canvas = canvasRef.current;
    if (canvas && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
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
              className={`notes-tab-btn ${mode === 'pen' ? 'active' : ''}`}
              onClick={() => {
                setMode('pen');
                setIsEraser(false);
              }}
              title="Kalemle Çizim & El Yazısı Modu"
            >
              <PenTool size={13} />
              <span>Kalem</span>
            </button>
            <button
              type="button"
              className={`notes-tab-btn ${mode === 'text' ? 'active' : ''}`}
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
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            />
            {!localStorage.getItem(`asistan_canvas_${selectedDate}`) && (
              <div className="canvas-watermark">
                <PenTool size={18} strokeWidth={1.5} />
                <span>Apple Pencil veya parmakla buraya serbestçe not al & çiz</span>
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
