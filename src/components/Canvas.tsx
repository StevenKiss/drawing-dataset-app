import React, { forwardRef } from "react";
import ReactSketchCanvas, { ReactSketchCanvasRef } from "react-sketch-canvas";

interface CanvasProps {
  width?: number;
  height?: number;
}

const Canvas = forwardRef<ReactSketchCanvasRef, CanvasProps>(({ width = 400, height = 400 }, ref) => {
  const style: React.CSSProperties = {
    border: "2px solid #000",
    borderRadius: "8px",
    width: `${width}px`,
    height: `${height}px`,
  };

  return (
    <ReactSketchCanvas
      ref={ref}
      style={style}
      strokeWidth={25}
      strokeColor="black"
      backgroundColor="white"
    />
  );
});

Canvas.displayName = 'Canvas';

export default Canvas; 