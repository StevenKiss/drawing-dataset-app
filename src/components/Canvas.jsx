// src/components/Canvas.jsx
import { forwardRef } from "react";
import { ReactSketchCanvas } from "react-sketch-canvas";

const Canvas = forwardRef(({ width = 400, height = 400 }, ref) => {
  const style = {
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

export default Canvas;
