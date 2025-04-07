// src/pages/DrawPage.jsx
import { useParams } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import Canvas from '../components/Canvas';

export default function DrawPage() {
  const { creatorId } = useParams();
  const canvasRef = useRef();
  const [creatorData, setCreatorData] = useState(null);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCreator = async () => {
      const docRef = doc(db, 'creators', creatorId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setCreatorData(snap.data());
      }
      setLoading(false);
    };
    fetchCreator();
  }, [creatorId]);

  const handleSubmitDrawing = async () => {
    if (!canvasRef.current || !creatorData) return;
  
    const exportData = await canvasRef.current.exportPaths();
    if (!exportData || exportData.length === 0) {
      alert("Please draw something before submitting.");
      return;
    }
  
    const base64 = await canvasRef.current.exportImage('png');
  
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.src = base64;
  
    img.onload = async () => {
      const size = creatorData.outputSize;
      canvas.width = size;
      canvas.height = size;
      ctx.drawImage(img, 0, 0, size, size);
  
      const imageData = ctx.getImageData(0, 0, size, size);
      const pixels = [];
  
      for (let i = 0; i < imageData.data.length; i += 4) {
        const grayscale = imageData.data[i]; // Use red channel as grayscale
        pixels.push(grayscale / 255); // Normalize
      }
  
      // Submit flattened pixel data to Firestore
      await addDoc(collection(db, 'drawings'), {
        creatorId,
        prompt: creatorData.prompts[currentPromptIndex],
        imageBase64: base64,
        imagePixels: pixels, // ✅ flattened 1D array
        createdAt: serverTimestamp(),
      });
  
      canvasRef.current.clearCanvas();
      setCurrentPromptIndex((prev) => prev + 1);
    };
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>;
  if (!creatorData || !creatorData.isOpen) return <div style={{ padding: '2rem' }}>This link is currently closed.</div>;
  if (currentPromptIndex >= creatorData.prompts.length) return <div style={{ padding: '2rem' }}>✅ Thanks for submitting your drawings!</div>;

  return (
    <div style={{ padding: '2rem' }}>
      <h2>🖍️ Draw: {creatorData.prompts[currentPromptIndex]}</h2>
      <p>Prompt {currentPromptIndex + 1} of {creatorData.prompts.length}</p>

      <Canvas canvasRef={canvasRef} />

      <div style={{ marginTop: '1rem' }}>
        <button onClick={handleSubmitDrawing} style={{ marginRight: '1rem' }}>✅ Submit Drawing</button>
        <button onClick={() => canvasRef.current?.clearCanvas()}>🧹 Clear</button>
      </div>
    </div>
  );
}
