// src/components/Canvas.jsx
import { forwardRef } from "react";
import { ReactSketchCanvas } from "react-sketch-canvas";

const styles = {
  border: "2px solid #000",
  borderRadius: "8px",
  width: "100%",
  height: "400px",
};

const Canvas = forwardRef((props, ref) => {
  return (
    <ReactSketchCanvas
      ref={ref}
      style={styles}
      strokeWidth={25}
      strokeColor="black"
      backgroundColor="white"
    />
  );
});

export default Canvas;
