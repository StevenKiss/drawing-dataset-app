import React, { useRef, useState } from "react";
import Canvas, { CanvasRef } from "./Canvas";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Brush, Check, X, Eraser, Settings } from "lucide-react";

interface DrawExampleModalProps {
  onSave: (base64: string) => void;
  onClose: () => void;
}

export default function DrawExampleModal({ onSave, onClose }: DrawExampleModalProps): JSX.Element {
  const canvasRef = useRef<CanvasRef>(null);
  const [brushSize, setBrushSize] = useState(25);
  const [tool, setTool] = useState<'brush' | 'eraser'>('brush');
  const [popoverOpen, setPopoverOpen] = useState(false);

  const handleSave = async (): Promise<void> => {
    try {
      const pixels = await canvasRef.current?.exportPaths();
      if (!pixels || pixels.length === 0) {
        alert("Please draw something before saving.");
        return;
      }

      const base64 = await canvasRef.current?.exportImage("png");
      if (base64) {
        onSave(base64);
        onClose();
      }
    } catch (err) {
      console.error("Failed to export image:", err);
      alert("Something went wrong while saving the drawing.");
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          padding: "2.5rem 2rem 2rem 2rem",
          borderRadius: "16px",
          minWidth: 340,
          maxWidth: 420,
          boxShadow: "0 4px 32px #0002",
          position: 'relative',
        }}
      >
        {/* Header row with only brush and eraser icons on the right */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h3 style={{ fontWeight: 700, fontSize: 22, margin: 0, lineHeight: 1.2 }}>Draw Example Image</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Button
              variant={tool === 'brush' ? 'default' : 'ghost'}
              size="icon"
              style={{
                borderRadius: '50%',
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: tool === 'brush' ? '#22c55e' : '#f3f4f6',
                color: '#fff',
                border: tool === 'brush' ? '2px solid #22c55e' : 'none',
                boxShadow: 'none',
                transition: 'background 0.2s',
                padding: 0,
                position: 'relative',
                cursor: 'pointer',
              }}
              aria-label={tool === 'brush' ? 'Brush (active)' : 'Brush'}
              onClick={() => setTool('brush')}
            >
              <Brush size={18} color={tool === 'brush' ? '#fff' : '#22c55e'} />
            </Button>
            <Button
              variant={tool === 'eraser' ? 'default' : 'ghost'}
              size="icon"
              style={{
                borderRadius: '50%',
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: tool === 'eraser' ? '#f87171' : '#f3f4f6',
                color: tool === 'eraser' ? '#fff' : '#222',
                border: tool === 'eraser' ? '2px solid #f87171' : 'none',
                boxShadow: 'none',
                transition: 'background 0.2s',
                padding: 0,
                position: 'relative',
                cursor: 'pointer',
              }}
              aria-label={tool === 'eraser' ? 'Eraser (active)' : 'Eraser'}
              onClick={() => setTool('eraser')}
            >
              <Eraser size={18} color={tool === 'eraser' ? '#fff' : '#f87171'} />
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  style={{
                    borderRadius: '50%',
                    width: 36,
                    height: 36,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#f3f4f6',
                    color: '#222',
                    border: 'none',
                    boxShadow: 'none',
                    transition: 'background 0.2s',
                    padding: 0,
                    position: 'relative',
                    cursor: 'pointer',
                  }}
                  aria-label="Adjust tool size"
                >
                  <Settings size={18} />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" sideOffset={8} style={{
                width: 220,
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                zIndex: 9999,
                background: '#fff',
                border: '1.5px solid #e5e7eb',
                borderRadius: 12,
                boxShadow: '0 4px 24px #0002',
              }}>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 10 }}>Tool Size</div>
                {/* Live preview of stroke */}
                <div style={{ width: '100%', display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                  <span style={{ fontSize: 13, color: '#888', minWidth: 40 }}>{brushSize}px</span>
                  <svg width="100" height="24" style={{ margin: '0 8px' }}>
                    <line x1="0" y1="12" x2="100" y2="12" stroke={tool === 'brush' ? '#22c55e' : '#f87171'} strokeWidth={brushSize} strokeLinecap="round" />
                  </svg>
                </div>
                {/* Slider */}
                <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 12, color: '#888' }}>Thin</span>
                  <Slider
                    value={[brushSize]}
                    onValueChange={(value) => {
                      const newSize = value[0];
                      setBrushSize(newSize);
                      canvasRef.current?.setBrushSize(newSize);
                    }}
                    min={5}
                    max={25}
                    step={1}
                    style={{ flex: 1 }}
                    aria-label="Tool size slider"
                    brushSize={brushSize}
                  />
                  <span style={{ fontSize: 12, color: '#888' }}>Thick</span>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: "1.5px solid #f1f5f9", margin: "1.5rem 0 1.25rem 0" }} />

        {/* Canvas (always square) */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
          <div
            style={{
              background: "#fff",
              borderRadius: 14,
              boxShadow: "0 2px 8px #0001",
              border: "2px solid #e5e7eb",
              padding: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 320,
              aspectRatio: '1/1',
              maxWidth: '90vw',
              maxHeight: '60vw',
            }}
          >
            <div style={{ width: '100%', height: '100%', aspectRatio: '1/1', position: 'relative' }}>
              <Canvas ref={canvasRef} brushSize={brushSize} width={300} height={300} isEraser={tool === 'eraser'} />
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
          <Button
            onClick={handleSave}
            className="flex-1"
            style={{ fontWeight: 600, fontSize: 16 }}
            variant="default"
            aria-label="Save Drawing"
          >
            <Check className="mr-2 h-5 w-5" /> Save Drawing
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
            style={{ fontWeight: 600, fontSize: 16 }}
            aria-label="Cancel"
          >
            <X className="mr-2 h-5 w-5" /> Cancel
          </Button>
        </div>
      </div>
    </div>
  );
} 