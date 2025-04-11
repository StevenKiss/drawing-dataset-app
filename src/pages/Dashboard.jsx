import { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { getAuth, signOut } from "firebase/auth";
import QRCode from "react-qr-code";
import { useLocation } from "react-router-dom";
import Papa from "papaparse";
import { v4 as uuidv4 } from 'uuid';

import DrawExampleModal from "../components/DrawExampleModal";

export default function Dashboard() {
  const auth = getAuth();
  const user = auth.currentUser;

  const [outputSize, setOutputSize] = useState(28);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [shareUrl, setShareUrl] = useState("");
  const [drawings, setDrawings] = useState([]);
  const [prompts, setPrompts] = useState([
    { label: "", description: "", exampleImage: null },
  ]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromptIndex, setEditingPromptIndex] = useState(null);
  const [datasets, setDatasets] = useState([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState(null);
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [stats, setStats] = useState({ total: 0, perPrompt: {}, lastTime: null});

  const location = useLocation();

  // Fetch the default set to start
  useEffect(() => {
    const fetchInitialDataset = async () => {
      if (user) {
        // Fetch all datasets
        const datasetQuery = collection(db, "creators", user.uid, "datasets");
        const snapshot = await getDocs(datasetQuery);
        const allDatasets = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
  
        setDatasets(allDatasets);
  
        const defaultDataset = allDatasets.find(d => d.id === "default") || allDatasets[0];
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
        const docRef = doc(db, "creators", user.uid, "datasets", selectedDatasetId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
        
          setPrompts(data.prompts || []);
          setOutputSize(data.outputSize || 28);
          setIsOpen(data.isOpen || false);
        }
        setLoading(false);
      }
    };

    fetchData();
    fetchDrawings();
  }, [user, selectedDatasetId]);

  // Save updates to Firestore
  const saveToFirestore = async (newData = {}) => {
    if (!user) return;
    const docRef = doc(db, "creators", user.uid);
    await setDoc(docRef, {
      prompts,
      outputSize,
      isOpen,
      ...newData,
    });
  };

  // To sign out
  const handleLogout = () => {
    const auth = getAuth();
    signOut(auth).then(() => {
      console.log("User signed out");
      window.location.href = "/login";
    });
  };

  const addPrompt = () => {
    const updated = [
      ...prompts,
      { label: "", description: "", exampleImage: null },
    ];
    setPrompts(updated);
    saveToFirestore({ prompts: updated });
  };

  const removePrompt = (index) => {
    const updated = prompts.filter((_, i) => i !== index);
    setPrompts(updated);
    saveToFirestore({ prompts: updated });
  };

  // Handle filed change
  const handleFieldChange = (index, field, value) => {
    const updated = [...prompts];
    updated[index][field] = value;
    setPrompts(updated);
    saveToFirestore({ prompts: updated });
  };

  // Output size change
  const handleOutputSizeChange = (e) => {
    const size = parseInt(e.target.value, 10);
    setOutputSize(size);
    saveToFirestore({ outputSize: size });
  };

  // Toggle link status
  const handleIsOpenToggle = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    saveToFirestore({ isOpen: newState });
  };

  // Fetch creator's drawings
  const fetchDrawings = async () => {
    if (!user) return;
    const q = query(
      collection(db, "drawings"),
      where("creatorId", "==", user.uid),
      where("datasetId", "==", selectedDatasetId)
    );
    const snapshot = await getDocs(q);
    const fetched = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setDrawings(fetched);

    // Compute Stats
    let promptCounts = {};
    let latestTime = null;

    for (const d of fetched) {
      promptCounts[d.prompt] = (promptCounts[d.promt] || 0) + 1;
      if (d.createdAt?.toDate) {
        const t = d.createdAt.toDate();
        if (!latestTime || t > latestTime) {
          latestTime = t;
        }
      }
    }

    setStats({
      total: fetched.lenghth,
      perPrompt: promptCounts,
      lastTime: latestTime,
    })
  };

  // Creating a new dataset
  const handleCreateDataset = async () => {
    if (!user) return;
    const newId = uuidv4();
    const newRef = doc(db, "creators", user.uid, "datasets", newId);
    const newDataset = {
      name: "Untitled Dataset",
      prompts: [],
      outputSize: 28,
      isOpen: false,
    };
    await setDoc(newRef, newDataset);
    setSelectedDatasetId(newId);
    setDatasets((prev) => [...prev, { id: newId, ...newDataset }]);
  };

  // Delete a dataset
  const handleDeleteDataset = async () => {
    if (!user || !selectedDatasetId) return;
  
    const confirmDelete = confirm("Are you sure you want to delete this dataset? This cannot be undone.");
    if (!confirmDelete) return;
  
    // Delete dataset document
    await deleteDoc(doc(db, "creators", user.uid, "datasets", selectedDatasetId));
  
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
  const handleExportCSV = (format = "pixels") => {
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

  if (loading)
    return <div style={{ padding: "2rem" }}>Loading dashboard...</div>;

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
        value={selectedDatasetId}
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
            doc(db, "creators", user.uid, "datasets", selectedDatasetId),
            { name: newName },
            { merge: true }
          );
        }}
        style={{ fontSize: "1.2rem", marginBottom: "1rem" }}
      />

      <h2>✏️ Drawing Prompts</h2>
      {prompts.map((prompt, index) => (
        <div
          key={index}
          style={{
            marginBottom: "1rem",
            padding: "1rem",
            border: "1px solid #ccc",
          }}
        >
          <input
            value={prompt.label}
            onChange={(e) => handleFieldChange(index, "label", e.target.value)}
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
          <br />
          <label>Upload or draw example:</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files[0];
              if (file) {
                const reader = new FileReader();
                reader.onloadend = () => {
                  handleFieldChange(index, "exampleImage", reader.result);
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
                style={{ maxWidth: "100px", border: "1px solid #aaa" }}
              />
              <br />
              <button
                onClick={() => handleFieldChange(index, "exampleImage", null)}
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
      ))}
      <button onClick={addPrompt}>➕ Add Prompt</button>

      <h2 style={{ marginTop: "2rem" }}>📏 Output Image Size</h2>
      <select
        value={outputSize}
        onChange={(e) =>
          handleOutputSizeChange({ target: { value: e.target.value } })
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
      <p><strong>Total Submissions:</strong> {stats.total}</p>
      {stats.lastTime && (
        <p>
          <strong>Last Submission:</strong>{" "}
          {stats.lastTime.toLocaleString()}
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
      </div>
      <div style={{ marginTop: "4rem", borderTop: "1px solid #ccc", paddingTop: "1rem" }}>
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
      {isModalOpen && (
        <DrawExampleModal
          onSave={(base64) => {
            const updated = [...prompts];
            if (typeof updated[editingPromptIndex] === "string") {
              updated[editingPromptIndex] = {
                label: updated[editingPromptIndex],
                description: "",
                exampleImage: base64,
              };
            } else {
              updated[editingPromptIndex].exampleImage = base64;
            }
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
