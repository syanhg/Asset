import { forwardRef, useEffect } from 'react';
import type { Background } from '../types';

export type GenerationStatus = 'idle' | 'thinking' | 'rendering' | 'done' | 'error';

export const VisualizationCanvas = forwardRef<HTMLCanvasElement, {
  bitmap: ImageBitmap | null;
  status: GenerationStatus;
  errorMessage: string | null;
  background: Background;
}>(function VisualizationCanvas({ bitmap, status, errorMessage, background }, ref) {
  useEffect(() => {
    if (!bitmap) return;
    const canvas = (ref as React.RefObject<HTMLCanvasElement | null>).current;
    if (!canvas) return;
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    ctx?.drawImage(bitmap, 0, 0);
  }, [bitmap, ref]);

  const checker = background === 'Transparent';

  return (
    <div className="flex flex-col items-center justify-center min-h-[420px] py-10">
      <div
        className="relative max-w-full transition-opacity-fast"
        style={checker ? {
          backgroundImage:
            'linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)',
          backgroundSize: '16px 16px',
          backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
        } : undefined}
      >
        <canvas ref={ref} className="max-w-full h-auto block" style={{ maxHeight: '640px' }} />
        {!bitmap && (
          <div className="w-[420px] max-w-full aspect-square flex items-center justify-center border border-black/20 text-[12px] text-black/40">
            {status === 'thinking' && 'Querying model…'}
            {status === 'rendering' && 'Executing R…'}
            {status === 'error' && 'No visualization'}
            {status === 'idle' && 'No visualization yet'}
          </div>
        )}
      </div>
      {errorMessage && (
        <pre className="mt-6 w-full max-w-[640px] border border-black p-3 text-[11px] whitespace-pre-wrap text-black">
          {errorMessage}
        </pre>
      )}
    </div>
  );
});
