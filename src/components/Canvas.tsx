import React, { forwardRef, useRef, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface CanvasProps {
  width?: number;
  height?: number;
  brushSize?: number;
  isEraser?: boolean;
}

export interface CanvasRef {
  clearCanvas: () => void;
  exportImage: (format: string) => Promise<string>;
  exportPaths: () => Promise<any>;
  setBrushSize: (size: number) => void;
}

const Canvas = forwardRef<CanvasRef, CanvasProps>(({ width = 400, height = 400, brushSize: initialBrushSize, isEraser = false }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastX = useRef(0);
  const lastY = useRef(0);
  const isMobile = useIsMobile();
  const brushSizeRef = useRef(initialBrushSize || (isMobile ? 15 : 25));
  const isEraserRef = useRef(isEraser);
  isEraserRef.current = isEraser;

  // Calculate responsive dimensions
  const canvasWidth = isMobile ? Math.min(width, window.innerWidth - 32) : width;
  const canvasHeight = isMobile ? Math.min(height, window.innerWidth - 32) : height;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Set initial styles (do not set strokeStyle here)
    ctx.lineWidth = brushSizeRef.current;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const startDrawing = (e: MouseEvent | TouchEvent) => {
      e.preventDefault(); // Prevent default to avoid scrolling on mobile
      isDrawing.current = true;
      const point = getPoint(e);
      lastX.current = point.x;
      lastY.current = point.y;
    };

    const draw = (e: MouseEvent | TouchEvent) => {
      e.preventDefault(); // Prevent default to avoid scrolling on mobile
      if (!isDrawing.current) return;
      const point = getPoint(e);
      
      ctx.beginPath();
      ctx.strokeStyle = isEraserRef.current ? 'white' : 'black';
      ctx.moveTo(lastX.current, lastY.current);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();

      lastX.current = point.x;
      lastY.current = point.y;
    };

    const stopDrawing = (e: MouseEvent | TouchEvent) => {
      e.preventDefault(); // Prevent default to avoid scrolling on mobile
      isDrawing.current = false;
    };

    const getPoint = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      
      // Get the actual display size of the canvas
      const displayWidth = rect.width;
      const displayHeight = rect.height;
      
      // Calculate scale factors
      const scaleX = canvas.width / displayWidth;
      const scaleY = canvas.height / displayHeight;
      
      let x: number, y: number;
      
      if (e instanceof MouseEvent) {
        // Use offsetX/offsetY for more accurate mouse positioning
        x = e.offsetX * scaleX;
        y = e.offsetY * scaleY;
      } else {
        // For touch events, calculate relative to canvas bounds
        const clientX = e.touches[0].clientX;
        const clientY = e.touches[0].clientY;
        x = (clientX - rect.left) * scaleX;
        y = (clientY - rect.top) * scaleY;
      }
      
      // Clamp values to canvas bounds
      return {
        x: Math.max(0, Math.min(canvas.width, x)),
        y: Math.max(0, Math.min(canvas.height, y))
      };
    };

    // Add event listeners
    canvas.addEventListener('mousedown', startDrawing, { passive: false });
    canvas.addEventListener('mousemove', draw, { passive: false });
    canvas.addEventListener('mouseup', stopDrawing, { passive: false });
    canvas.addEventListener('mouseout', stopDrawing, { passive: false });
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDrawing, { passive: false });

    // Cleanup
    return () => {
      canvas.removeEventListener('mousedown', startDrawing);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDrawing);
      canvas.removeEventListener('mouseout', stopDrawing);
      canvas.removeEventListener('touchstart', startDrawing);
      canvas.removeEventListener('touchmove', draw);
      canvas.removeEventListener('touchend', stopDrawing);
    };
  }, [canvasWidth, canvasHeight, isMobile]);

  // Expose methods via ref
  React.useImperativeHandle(ref, () => ({
    clearCanvas: () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    },
    setBrushSize: (size: number) => {
      brushSizeRef.current = size;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.lineWidth = size;
    },
    exportImage: async (format: string) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        console.error("Canvas element not found");
        return '';
      }
      try {
        return canvas.toDataURL(`image/${format}`);
      } catch (err) {
        console.error("Error exporting image:", err);
        return '';
      }
    },
    exportPaths: async () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        console.error("Canvas element not found");
        return [];
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error("Could not get canvas context");
        return [];
      }
      
      try {
        const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
        const pixels = [];
        for (let i = 0; i < imageData.data.length; i += 4) {
          const r = imageData.data[i];
          const g = imageData.data[i + 1];
          const b = imageData.data[i + 2];
          const grayscale = (r + g + b) / 3 / 255;
          pixels.push(grayscale);
        }
        return pixels;
      } catch (err) {
        console.error("Error exporting paths:", err);
        return [];
      }
    }
  }));

  return (
    <canvas
      ref={canvasRef}
      style={{
        border: "2px solid #000",
        borderRadius: "8px",
        width: `${canvasWidth}px`,
        height: `${canvasHeight}px`,
        touchAction: 'none',
        maxWidth: '100%',
        maxHeight: '100%',
        display: 'block', // Ensure no extra spacing
        boxSizing: 'border-box' // Include border in size calculation
      }}
    />
  );
});

Canvas.displayName = 'Canvas';

export default Canvas; 