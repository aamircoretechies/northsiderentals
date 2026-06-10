import { useCallback, useEffect, useRef } from 'react';

export type SignaturePadProps = {
  disabled?: boolean;
  /** Raw PNG base64 without the `data:image/png;base64,` prefix, or null when cleared. */
  onChange?: (pngBase64: string | null) => void;
};

function stripDataUrlPrefix(dataUrl: string): string {
  const prefix = 'data:image/png;base64,';
  return dataUrl.startsWith(prefix) ? dataUrl.slice(prefix.length) : dataUrl;
}

function exportOptimizedSignatureBase64(
  source: HTMLCanvasElement,
): string | null {
  const srcCtx = source.getContext('2d');
  if (!srcCtx) return null;

  const w = source.width;
  const h = source.height;
  const data = srcCtx.getImageData(0, 0, w, h).data;

  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;

  // Find non-transparent bounds (drawn ink).
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const alpha = data[(y * w + x) * 4 + 3];
      if (alpha > 10) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) return null;

  const pad = 8;
  const cropX = Math.max(0, minX - pad);
  const cropY = Math.max(0, minY - pad);
  const cropW = Math.min(w - cropX, maxX - minX + 1 + pad * 2);
  const cropH = Math.min(h - cropY, maxY - minY + 1 + pad * 2);

  const maxOutW = 700;
  const maxOutH = 220;
  const scale = Math.min(1, maxOutW / cropW, maxOutH / cropH);
  const outW = Math.max(1, Math.floor(cropW * scale));
  const outH = Math.max(1, Math.floor(cropH * scale));

  const out = document.createElement('canvas');
  out.width = outW;
  out.height = outH;
  const outCtx = out.getContext('2d');
  if (!outCtx) return null;
  outCtx.drawImage(source, cropX, cropY, cropW, cropH, 0, 0, outW, outH);

  return stripDataUrlPrefix(out.toDataURL('image/png'));
}

export function SignaturePad({ disabled, onChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const w = parent.clientWidth;
    const h = 180;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  useEffect(() => {
    resizeCanvas();
    const ro = new ResizeObserver(() => resizeCanvas());
    const el = canvasRef.current?.parentElement;
    if (el) ro.observe(el);
    return () => ro.disconnect();
  }, [resizeCanvas]);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const emit = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !onChange) return;
    onChange(exportOptimizedSignatureBase64(canvas));
  }, [onChange]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const { x, y } = pos(e);
    last.current = { x, y };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled || !drawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    last.current = { x, y };
  };

  const finishStroke = () => {
    if (drawing.current) {
      drawing.current = false;
      emit();
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawing.current = false;
    onChange?.(null);
  };

  return (
    <div className="flex flex-col mt-4">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[15px] text-black">Sign here</span>
        <button
          type="button"
          disabled={disabled}
          onClick={clear}
          className="text-[13px] font-semibold text-[#0061e0] hover:underline disabled:opacity-50 disabled:pointer-events-none cursor-pointer bg-transparent border-0 p-0"
        >
          Clear
        </button>
      </div>
      <span className="text-[13px] text-[#8692a6] mb-3">
        Use your finger or stylus in the area below
      </span>
      <div className="border border-[#e2e8f0] rounded-[8px] bg-white w-full max-w-full touch-none">
        <canvas
          ref={canvasRef}
          className="block w-full cursor-crosshair rounded-[8px]"
          style={{ height: 180 }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishStroke}
          onPointerCancel={finishStroke}
        />
      </div>
    </div>
  );
}
