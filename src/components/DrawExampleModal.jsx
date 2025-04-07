import { useRef } from "react";
import Canvas from "./Canvas"; // reuse your existing Canvas component

export default function DrawExampleModal({ onSave, onClose }) {
  const canvasRef = useRef();

  const handleSave = async () => {
    try {
      const paths = await canvasRef.current.exportPaths();
      if (!paths || paths.length === 0) {
        alert("Please draw something before saving.");
        return;
      }

      const base64 = await canvasRef.current.exportImage("png");
      onSave(base64);
      onClose();
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
          padding: "2rem",
          borderRadius: "8px",
        }}
      >
        <h3>🖌️ Draw Example Image</h3>
        <Canvas ref={canvasRef} />
        <div style={{ marginTop: "1rem" }}>
          <button onClick={handleSave}>✅ Save Drawing</button>
          <button onClick={onClose} style={{ marginLeft: "1rem" }}>
            ❌ Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
