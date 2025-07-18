import React, { useEffect, useState, ChangeEvent } from "react";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  DocumentData,
} from "firebase/firestore";
import { db } from "../../firebase";
import { getAuth, signOut, User } from "firebase/auth";
import QRCode from "react-qr-code";
import { useLocation } from "react-router-dom";
import Papa from "papaparse";
import { v4 as uuidv4 } from "uuid";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

import DrawExampleModal from "../../components/DrawExampleModal";

interface Prompt {
  label: string;
  description: string;
  exampleImage: string | null;
}

interface Dataset {
  id: string;
  name: string;
  prompts: Prompt[];
  outputSize: number;
  isOpen: boolean;
  shuffleMode?: boolean;
}

interface Stats {
  total: number;
  perPrompt: Record<string, number>;
  lastTime: Date | null;
}

interface Drawing {
  id: string;
  prompt: string;
  data: string;
  timestamp: number;
  imagePixels: number[][];
  imageBase64: string;
  createdAt?: {
    toDate: () => Date;
  };
}

export default function Dashboard(): React.ReactElement {
  const auth = getAuth();
  const user: User | null = auth.currentUser;

  const [outputSize, setOutputSize] = useState<number>(28);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [shareUrl, setShareUrl] = useState<string>("");
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([
    { label: "", description: "", exampleImage: null },
  ]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingPromptIndex, setEditingPromptIndex] = useState<number | null>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [shuffleMode, setShuffleMode] = useState<boolean>(false);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    perPrompt: {},
    lastTime: null,
  });

  const location = useLocation();

  // Fetch the default set to start
  useEffect(() => {
    const fetchInitialDataset = async () => {
      if (user) {
        // Fetch all datasets
        const datasetQuery = collection(db, "creators", user.uid, "datasets");
        const snapshot = await getDocs(datasetQuery);
        const allDatasets = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Dataset[];

        setDatasets(allDatasets);

        const defaultDataset =
          allDatasets.find((d) => d.id === "default") || allDatasets[0];
        if (defaultDataset) {
          setSelectedDatasetId(defaultDataset.id);
        }
      }
    };

    fetchInitialDataset();
  }, [user]);

  // Fetch dashboard state from Firestore on mount
  useEffect(() => {
    const fetchData = async () => {
      if (user && selectedDatasetId) {
        // Create link for other to draw with
        const baseUrl = window.location.origin;
        const link = `${baseUrl}/draw/${user.uid}/${selectedDatasetId}`;
        setShareUrl(link);

        // Access database
        const docRef = doc(
          db,
          "creators",
          user.uid,
          "datasets",
          selectedDatasetId
        );
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as Dataset;

          setPrompts(data.prompts || []);
          setOutputSize(data.outputSize || 28);
          setIsOpen(data.isOpen || false);
          setShuffleMode(data.shuffleMode || false);
        }
        setLoading(false);
      }
    };

    fetchData();
    fetchDrawings();
  }, [user, selectedDatasetId]);

  // Make sure prompt at a minimum
  const validatePrompts = (): boolean => {
    if (prompts.length === 0) {
      alert("You must have at least one prompt.");
      return false;
    }
    for (let i = 0; i < prompts.length; i++) {
      const label = prompts[i]?.label?.trim();
      if (!label) {
        alert(`Prompt ${i + 1} is missing a label.`);
        return false;
      }
    }
    return true;
  };

  // Save updates to Firestore
  const saveToFirestore = async (newData: Partial<Dataset> = {}, skipValidation = false): Promise<void> => {
    if (!user) return;
    if (!skipValidation && !validatePrompts()) return; // prevent save if invalid

    const docRef = doc(db, "creators", user.uid, "datasets", selectedDatasetId!);
    await setDoc(docRef, {
      prompts,
      outputSize,
      isOpen,
      ...newData,
    });
  };

  // To sign out
  const handleLogout = async (): Promise<void> => {
    const auth = getAuth();
    await signOut(auth);
    console.log("User signed out");
    window.location.href = "/login";
  };

  const addPrompt = (): void => {
    const updated = [
      ...prompts,
      { label: "", description: "", exampleImage: null },
    ];
    setPrompts(updated);
    saveToFirestore({ prompts: updated }, true);
  };

  const removePrompt = (index: number): void => {
    const updated = prompts.filter((_, i) => i !== index);
    setPrompts(updated);
    saveToFirestore({ prompts: updated }, true);
  };

  // Handle field change
  const handleFieldChange = (index: number, field: keyof Prompt, value: string | null): void => {
    const updated = [...prompts];
    if (field === 'exampleImage') {
      updated[index].exampleImage = value;
    } else {
      updated[index][field] = value as string;
    }
    setPrompts(updated);
    saveToFirestore({ prompts: updated }, true);
  };

  // Output size change
  const handleOutputSizeChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const size = parseInt(e.target.value, 10);
    setOutputSize(size);
    saveToFirestore({ outputSize: size });
  };

  // Link viewage
  const handleIsOpenToggle = (): void => {
    const newState = !isOpen;

    // If opening the link, run validation
    if (newState) {
      if (prompts.length === 0) {
        alert("You must have at least one prompt.");
        return;
      }

      for (let i = 0; i < prompts.length; i++) {
        const label = prompts[i].label?.trim();
        if (!label) {
          alert(`Prompt ${i + 1} is missing a label.`);
          return;
        }
      }
    }

    setIsOpen(newState);
    saveToFirestore({ isOpen: newState });
  };

  // Fetch creator's drawings
  const fetchDrawings = async (): Promise<void> => {
    if (!user || !selectedDatasetId) return;
    const q = query(
      collection(db, "drawings"),
      where("creatorId", "==", user.uid),
      where("datasetId", "==", selectedDatasetId)
    );
    const snapshot = await getDocs(q);
    const fetched = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Drawing[];
    setDrawings(fetched);

    // Compute Stats
    const promptCounts: Record<string, number> = {};
    let latestTime: Date | null = null;

    for (const d of fetched) {
      promptCounts[d.prompt] = (promptCounts[d.prompt] || 0) + 1;
      if (d.createdAt?.toDate) {
        const t = d.createdAt.toDate();
        if (!latestTime || t > latestTime) {
          latestTime = t;
        }
      }
    }

    setStats({
      total: fetched.length,
      perPrompt: promptCounts,
      lastTime: latestTime,
    });
  };

  // Creating a new dataset
  const handleCreateDataset = async (): Promise<void> => {
    if (!user) return;
    const newId = uuidv4();
    const newRef = doc(db, "creators", user.uid, "datasets", newId);
    const newDataset: Dataset = {
      id: newId,
      name: "Untitled Dataset",
      prompts: [],
      outputSize: 28,
      isOpen: false,
    };
    await setDoc(newRef, newDataset);
    setSelectedDatasetId(newId);
    setDatasets((prev) => [...prev, newDataset]);
  };

  // Delete a dataset
  const handleDeleteDataset = async (): Promise<void> => {
    if (!user || !selectedDatasetId) return;

    const confirmDelete = confirm(
      "Are you sure you want to delete this dataset? This cannot be undone."
    );
    if (!confirmDelete) return;

    // Delete dataset document
    await deleteDoc(
      doc(db, "creators", user.uid, "datasets", selectedDatasetId)
    );

    // Remove from local state
    const remaining = datasets.filter((ds) => ds.id !== selectedDatasetId);
    setDatasets(remaining);

    // Select another dataset or reset
    if (remaining.length > 0) {
      setSelectedDatasetId(remaining[0].id);
    } else {
      setSelectedDatasetId(null);
      setPrompts([]);
      setOutputSize(28);
      setIsOpen(false);
      setShareUrl("");
      setDrawings([]);
    }

    console.log("✅ Dataset deleted");
  };

  // Export button handling
  const handleExportCSV = (format: "pixels" | "base64" = "pixels"): void => {
    if (!drawings.length) {
      alert("No drawings to export.");
      return;
    }

    const rows = drawings
      .map((drawing) => {
        const label = drawing.prompt;
        if (format === "pixels") {
          const flatPixels = drawing.imagePixels.flat(); // ensure 1D
          return {
            label,
            ...Object.fromEntries(
              flatPixels.map((val, i) => [`pixel_${i}`, val])
            ),
          };
        } else if (format === "base64") {
          return { label, imageBase64: drawing.imageBase64 };
        }
        return null;
      })
      .filter(Boolean);

    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `dataset_${format}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Zip download handling
  const handleDownloadZip = async (): Promise<void> => {
    if (!drawings.length) {
      alert("No drawings to export.");
      return;
    }

    const zip = new JSZip();
    const labels: { filename: string; label: string }[] = [];

    for (let i = 0; i < drawings.length; i++) {
      const d = drawings[i];
      const fileName = `img_${i + 1}.png`;
      labels.push({ filename: fileName, label: d.prompt });

      // Add image to zip
      const base64Data = d.imageBase64.split(",")[1]; // Remove data:image/... part
      zip.file(fileName, base64Data, { base64: true });
    }

    // Add labels.csv
    const csv = Papa.unparse(labels);
    zip.file("labels.csv", csv);

    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, "dataset.zip");
  };

  // Handle JSON export
  const handleExportJSON = (): void => {
    if (!drawings.length) {
      alert("No drawings to export.");
      return;
    }

    const jsonData = drawings.map((d) => ({
      label: d.prompt,
      pixels: d.imagePixels,
    }));

    const blob = new Blob([JSON.stringify(jsonData, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "dataset.json");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div style={{ padding: "2rem" }}>Loading dashboard...</div>;

  return (
    <div style={{ padding: "2rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <h1>Dataset Creator Dashboard</h1>
        <button onClick={handleLogout} style={{ padding: "0.5rem 1rem" }}>
          🚪 Log Out
        </button>
        <button onClick={handleCreateDataset}>➕ Create New Dataset</button>
      </div>

      <select
        value={selectedDatasetId || ""}
        onChange={(e) => setSelectedDatasetId(e.target.value)}
      >
        {datasets.map((ds) => (
          <option key={ds.id} value={ds.id}>
            {ds.name || ds.id}
          </option>
        ))}
      </select>

      <input
        type="text"
        value={
          datasets.find((ds) => ds.id === selectedDatasetId)?.name || "Untitled"
        }
        onChange={async (e) => {
          const newName = e.target.value;
          setDatasets((prev) =>
            prev.map((ds) =>
              ds.id === selectedDatasetId ? { ...ds, name: newName } : ds
            )
          );
          await setDoc(
            doc(db, "creators", user!.uid, "datasets", selectedDatasetId!),
            { name: newName },
            { merge: true }
          );
        }}
        style={{ fontSize: "1.2rem", marginBottom: "1rem" }}
      />

      <h2>✏️ Drawing Prompts</h2>
      <DragDropContext
        onDragEnd={(result) => {
          const { source, destination } = result;
          if (!destination) return;

          const reordered = Array.from(prompts);
          const [moved] = reordered.splice(source.index, 1);
          reordered.splice(destination.index, 0, moved);

          setPrompts(reordered);
          saveToFirestore({ prompts: reordered }, true); // Skip validation on reorder
        }}
      >
        <Droppable droppableId="promptList">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps}>
              {prompts.map((prompt, index) => (
                <Draggable
                  key={index}
                  draggableId={`prompt-${index}`}
                  index={index}
                >
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      style={{
                        ...provided.draggableProps.style,
                        marginBottom: "1rem",
                        padding: "1rem",
                        border: "1px solid #ccc",
                        background: "#f9f9f9",
                      }}
                    >
                      <input
                        value={prompt.label}
                        onChange={(e) =>
                          handleFieldChange(index, "label", e.target.value)
                        }
                        placeholder={`Prompt Label`}
                        style={{ marginRight: "0.5rem", width: "200px" }}
                      />
                      <br />
                      <textarea
                        value={prompt.description}
                        onChange={(e) =>
                          handleFieldChange(
                            index,
                            "description",
                            e.target.value.slice(0, 200)
                          )
                        }
                        placeholder="Description (max 200 chars)"
                        rows={3}
                        style={{ width: "100%", marginTop: "0.5rem" }}
                      />
                      <label>Upload or draw example:</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              handleFieldChange(
                                index,
                                "exampleImage",
                                reader.result as string
                              );
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <button
                        style={{ marginLeft: "1rem" }}
                        onClick={() => {
                          setEditingPromptIndex(index);
                          setIsModalOpen(true);
                        }}
                      >
                        ✏️ Draw Instead
                      </button>
                      {prompt.exampleImage && (
                        <div style={{ marginTop: "0.5rem" }}>
                          <img
                            src={prompt.exampleImage}
                            alt="example"
                            style={{
                              maxWidth: "100px",
                              border: "1px solid #aaa",
                            }}
                          />
                          <br />
                          <button
                            onClick={() =>
                              handleFieldChange(index, "exampleImage", null)
                            }
                          >
                            Remove Image
                          </button>
                        </div>
                      )}
                      <br />
                      <button
                        onClick={() => removePrompt(index)}
                        style={{ marginTop: "0.5rem" }}
                      >
                        Remove Prompt
                      </button>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <button onClick={addPrompt}>➕ Add Prompt</button>

      <h2 style={{ marginTop: "2rem" }}>📏 Output Image Size</h2>
      <select
        value={outputSize}
        onChange={(e) =>
          handleOutputSizeChange({ target: { value: e.target.value } } as ChangeEvent<HTMLInputElement>)
        }
      >
        {[28, 32, 64, 128, 256].map((size) => (
          <option key={size} value={size}>
            {size} x {size}
          </option>
        ))}
      </select>

      <h2 style={{ marginTop: "2rem" }}>🔗 Link Status</h2>
      <label>
        <input type="checkbox" checked={isOpen} onChange={handleIsOpenToggle} />
        {isOpen ? "Open for Responses" : "Closed to Responses"}
      </label>

      <h2 style={{ marginTop: "2rem" }}>🎲 Shuffle Mode</h2>
      <label>
        <input
          type="checkbox"
          checked={shuffleMode}
          onChange={() => {
            const newVal = !shuffleMode;
            setShuffleMode(newVal);
            saveToFirestore({ shuffleMode: newVal }, true); // no validation needed
          }}
        />
        Show prompts in random order for contributors
      </label>

      {isOpen && (
        <>
          <h2 style={{ marginTop: "2rem" }}>📤 Shareable Link</h2>
          <p>
            Send this to contributors:
            <br />
            <a href={shareUrl} target="_blank" rel="noreferrer">
              {shareUrl}
            </a>
          </p>

          <h3>📱 QR Code</h3>
          <QRCode value={shareUrl} size={160} />
        </>
      )}

      <h2 style={{ marginTop: "2rem" }}>📊 Dataset Stats</h2>
      <p>
        <strong>Total Submissions:</strong> {stats.total}
      </p>
      {stats.lastTime && (
        <p>
          <strong>Last Submission:</strong> {stats.lastTime.toLocaleString()}
        </p>
      )}

      <h3>Submissions per Prompt</h3>
      <ul>
        {Object.entries(stats.perPrompt).map(([label, count]) => (
          <li key={label}>
            <strong>{label || "(No Label)"}:</strong> {count}
          </li>
        ))}
      </ul>

      <h2 style={{ marginTop: "3rem" }}>🧪 Dataset Preview</h2>
      {drawings.length === 0 ? (
        <p>No drawings submitted yet.</p>
      ) : (
        prompts.map((prompt, promptIndex) => {
          const drawingsForPrompt = drawings.filter(
            (d) => d.prompt === prompt.label
          );
          return (
            <div key={promptIndex} style={{ marginBottom: "2rem" }}>
              <h3>{prompt.label || `Prompt ${promptIndex + 1}`}</h3>
              {drawingsForPrompt.length === 0 ? (
                <p style={{ fontStyle: "italic" }}>
                  No drawings for this prompt yet.
                </p>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))",
                    gap: "1rem",
                    marginTop: "1rem",
                  }}
                >
                  {drawingsForPrompt.map((drawing) => (
                    <canvas
                      key={drawing.id}
                      width={Number(outputSize)}
                      height={Number(outputSize)}
                      title="Click to delete"
                      onClick={async () => {
                        if (
                          confirm(
                            "Are you sure you want to delete this drawing?"
                          )
                        ) {
                          await deleteDoc(doc(db, "drawings", drawing.id));
                          fetchDrawings(); // Refresh
                        }
                      }}
                      ref={(canvas) => {
                        if (canvas && drawing.imagePixels) {
                          const flat = drawing.imagePixels.flat();
                          const totalPixels = flat.length;
                          const size = Math.sqrt(totalPixels); // Recover the original size
                          const ctx = canvas.getContext("2d");
                          if (ctx) {
                            const imgData = ctx.createImageData(size, size);

                            for (let i = 0; i < totalPixels; i++) {
                              const grayscale = Math.floor(flat[i] * 255);
                              imgData.data[i * 4 + 0] = grayscale;
                              imgData.data[i * 4 + 1] = grayscale;
                              imgData.data[i * 4 + 2] = grayscale;
                              imgData.data[i * 4 + 3] = 255;
                            }

                            canvas.width = size;
                            canvas.height = size;
                            ctx.putImageData(imgData, 0, 0);
                          }
                        }
                      }}
                      style={{ border: "1px solid #ccc", cursor: "pointer" }}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}

      <h2 style={{ marginTop: "3rem" }}>⬇️ Export Dataset</h2>
      <div style={{ display: "flex", gap: "1rem" }}>
        <button onClick={() => handleExportCSV("pixels")}>
          Download Pixel CSV
        </button>
        <button onClick={() => handleExportCSV("base64")}>
          Download Base64 CSV
        </button>
        <button onClick={handleDownloadZip}>Download PNGs + Labels ZIP</button>
        <button onClick={handleExportJSON}>Download Tensor JSON</button>
      </div>

      <div
        style={{
          marginTop: "4rem",
          borderTop: "1px solid #ccc",
          paddingTop: "1rem",
        }}
      >
        <button
          onClick={handleDeleteDataset}
          style={{
            backgroundColor: "#ff4d4f",
            color: "white",
            padding: "0.5rem 1rem",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          🗑️ Delete This Dataset
        </button>
      </div>

      {isModalOpen && editingPromptIndex !== null && (
        <DrawExampleModal
          onSave={(base64: string) => {
            const updated = [...prompts];
            updated[editingPromptIndex].exampleImage = base64;
            setPrompts(updated);
            saveToFirestore({ prompts: updated });
          }}
          onClose={() => {
            setIsModalOpen(false);
            setEditingPromptIndex(null);
          }}
        />
      )}
    </div>
  );
} 