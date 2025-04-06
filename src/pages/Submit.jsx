import { useRef } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import Canvas from '../components/Canvas';

export default function Submit() {
  const canvasRef = useRef();

  const handleSave = async () => {
    console.log("Save button clicked");

    if (!canvasRef.current) {
      console.warn("Canvas not ready");
      return;
    }

    try {
      // 1. Get the base64 PNG string from the canvas
      const imageDataUrl = await canvasRef.current.exportImage('png');
      console.log("Image exported:", imageDataUrl);

      // 2. Convert base64 to image and draw onto a 28x28 offscreen canvas
      const img = new Image();
      img.src = imageDataUrl;

      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const size = 28;
      const offscreen = document.createElement('canvas');
      offscreen.width = size;
      offscreen.height = size;
      const ctx = offscreen.getContext('2d');

      ctx.drawImage(img, 0, 0, size, size);

      // 3. Get grayscale pixel data
      const imageData = ctx.getImageData(0, 0, size, size);
      const grayscaleMatrix = [];

      for (let i = 0; i < size; i++) {
        const row = [];
        for (let j = 0; j < size; j++) {
          const index = (i * size + j) * 4;
          const r = imageData.data[index];
          const g = imageData.data[index + 1];
          const b = imageData.data[index + 2];
          // Calculate luminance using standard formula
          const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
          row.push(gray / 255);
        }
        grayscaleMatrix.push(row);
      }

      // 4. Flatten the grayscale matrix to a 1D array
      const flatPixels = grayscaleMatrix.flat();

      // 5. Save to Firestore
      await addDoc(collection(db, 'drawings'), {
        imageBase64: imageDataUrl,
        pixels: flatPixels,
        width: size,
        height: size,
        createdAt: serverTimestamp(),
      });

      console.log("✅ Drawing saved to Firestore!");
    } catch (err) {
      console.error("❌ Firestore save error:", err);
    }
  };

  const handleClear = () => {
    console.log("Canvas cleared");
    canvasRef.current.clearCanvas();
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Submit Your Drawing ✏️</h1>
      <Canvas canvasRef={canvasRef} />
      <button onClick={handleSave}>Save Drawing</button>
      <button onClick={handleClear}>Clear</button>
    </div>
  );
}
