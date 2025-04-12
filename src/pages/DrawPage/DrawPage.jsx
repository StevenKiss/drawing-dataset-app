// src/pages/DrawPage.jsx
import { useParams } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase";
import Canvas from "../../components/Canvas";

export default function DrawPage() {
  const { creatorId, datasetId } = useParams();
  const canvasRef = useRef();
  const [creatorData, setCreatorData] = useState(null);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCreator = async () => {
      if (!creatorId || !datasetId) return;
  
      try {
        const docRef = doc(db, "creators", creatorId, "datasets", datasetId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setCreatorData(snap.data());

          const data = snap.data();

          // If shuffleMode is true, shuffle the prompts
          const prompts = data.prompts || [];
          if (data.shuffleMode) {
            data.prompts = [...prompts].sort(() => Math.random() - 0.5);
          }

          setCreatorData(data);
          console.log("Fetched dataset:", snap.data());
        } else {
          setCreatorData(null);
        }
      } catch (err) {
        console.error("Error fetching dataset:", err);
        setCreatorData(null);
      } finally {
        setLoading(false);
      }
    };
  
    fetchCreator();
  }, [creatorId, datasetId]);

  const handleSubmitDrawing = async () => {
    if (!canvasRef.current || !creatorData) return;

    const exportData = await canvasRef.current.exportPaths();
    if (!exportData || exportData.length === 0) {
      alert("Please draw something before submitting.");
      return;
    }

    const base64 = await canvasRef.current.exportImage("png");

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
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
        const grayscale = imageData.data[i]; // red channel as grayscale
        pixels.push(grayscale / 255);
      }

      const promptObj = creatorData.prompts[currentPromptIndex];
      const label =
        typeof promptObj === "string"
          ? promptObj
          : promptObj.label || `Prompt ${currentPromptIndex + 1}`;

      await addDoc(collection(db, "drawings"), {
        creatorId,
        datasetId,
        prompt: label,
        imageBase64: base64,
        imagePixels: pixels,
        createdAt: serverTimestamp(),
      });

      await canvasRef.current.clearCanvas();
      setCurrentPromptIndex((prev) => prev + 1);
    };
  };

  if (loading)
    return <div style={{ padding: "2rem" }}>Loading creator data...</div>;
  if (!creatorData)
    return (
      <div style={{ padding: "2rem" }}>
        ❌ Invalid link. Dataset not found.
      </div>
    );
  
  if (!creatorData.isOpen)
    return (
      <div style={{ padding: "2rem" }}>
        ❌ This link is currently closed to submissions.
      </div>
    );
  if (currentPromptIndex >= creatorData.prompts.length)
    return (
      <div style={{ padding: "2rem" }}>
        ✅ Thanks for submitting all your drawings!
      </div>
    );

  const currentPrompt = creatorData.prompts[currentPromptIndex];
  const label =
    typeof currentPrompt === "string"
      ? currentPrompt
      : currentPrompt.label || `Prompt ${currentPromptIndex + 1}`;
  const description =
    typeof currentPrompt === "object" ? currentPrompt.description : "";

  return (
    <div style={{ padding: "2rem" }}>
      <h2>🖍️ Draw: {label}</h2>
      <p>
        Prompt {currentPromptIndex + 1} of {creatorData.prompts.length}
      </p>
      {description && (
        <p style={{ fontStyle: "italic", marginBottom: "1rem" }}>
          {description}
        </p>
      )}

      {typeof currentPrompt === "object" && currentPrompt.exampleImage && (
        <div style={{ marginBottom: "1rem" }}>
          <p style={{ marginBottom: "0.25rem" }}>🖼️ Example Drawing:</p>
          <img
            src={currentPrompt.exampleImage}
            alt="Example"
            style={{ maxWidth: "150px", border: "1px solid #ccc" }}
          />
        </div>
      )}

      <div style={{ width: 400, height: 400 }}>
        <Canvas ref={canvasRef} width={400} height={400} />
      </div>

      <div style={{ marginTop: "1rem" }}>
        <button onClick={handleSubmitDrawing} style={{ marginRight: "1rem" }}>
          ✅ Submit Drawing
        </button>
        <button onClick={() => canvasRef.current?.clearCanvas()}>
          🧹 Clear
        </button>
      </div>
    </div>
  );
}
