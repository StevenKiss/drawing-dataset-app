import React, { forwardRef, useRef, useEffect } from "react";

interface CanvasProps {
  width?: number;
  height?: number;
}

export interface CanvasRef {
  clearCanvas: () => void;
  exportImage: (format: string) => Promise<string>;
  exportPaths: () => Promise<any>;
}

const Canvas = forwardRef<CanvasRef, CanvasProps>(({ width = 400, height = 400 }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastX = useRef(0);
  const lastY = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Set initial styles
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 25;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);

    const startDrawing = (e: MouseEvent | TouchEvent) => {
      isDrawing.current = true;
      const point = getPoint(e);
      lastX.current = point.x;
      lastY.current = point.y;
    };

    const draw = (e: MouseEvent | TouchEvent) => {
      if (!isDrawing.current) return;
      const point = getPoint(e);
      
      ctx.beginPath();
      ctx.moveTo(lastX.current, lastY.current);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();

      lastX.current = point.x;
      lastY.current = point.y;
    };

    const stopDrawing = () => {
      isDrawing.current = false;
    };

    const getPoint = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (e instanceof MouseEvent) {
        return {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        };
      } else {
        return {
          x: e.touches[0].clientX - rect.left,
          y: e.touches[0].clientY - rect.top
        };
      }
    };

    // Add event listeners
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    canvas.addEventListener('touchstart', startDrawing);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', stopDrawing);

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
  }, [width, height]);

  // Expose methods via ref
  React.useImperativeHandle(ref, () => ({
    clearCanvas: () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, width, height);
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
        const imageData = ctx.getImageData(0, 0, width, height);
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
        width: `${width}px`,
        height: `${height}px`,
        touchAction: 'none'
      }}
    />
  );
});

Canvas.displayName = 'Canvas';

export default Canvas; 