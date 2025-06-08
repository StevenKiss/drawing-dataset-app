// src/pages/Dashboard/Dashboard.tsx
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
} from "firebase/firestore";
import { getAuth, signOut, User } from "firebase/auth";
import { useLocation } from "react-router-dom";
import QRCode from "react-qr-code";
import Papa from "papaparse";
import { v4 as uuidv4 } from "uuid";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import DrawExampleModal from "../../components/DrawExampleModal";
import { db } from "../../firebase";

// ShadCN UI components & icons
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  LogOut,
  Plus,
  Trash2,
  Edit3,
  Download,
  QrCode as IconQrCode,
  BarChart3,
  Image as IconImage,
  Settings,
  Lock,
  Unlock,
  Shuffle,
  Upload,
} from "lucide-react";

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
  imagePixels: number[][];
  imageBase64: string;
  createdAt?: { toDate: () => Date };
}

export default function Dashboard(): React.ReactElement {
  const auth = getAuth();
  const user: User | null = auth.currentUser;
  const location = useLocation();

  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [outputSize, setOutputSize] = useState<number>(28);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [shuffleMode, setShuffleMode] = useState<boolean>(false);
  const [shareUrl, setShareUrl] = useState<string>("");
  const [stats, setStats] = useState<Stats>({
    total: 0,
    perPrompt: {},
    lastTime: null,
  });
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingPromptIndex, setEditingPromptIndex] = useState<number | null>(null);

  // Fetch all datasets, pick default on mount
  useEffect(() => {
    async function fetchDatasets() {
      if (!user) return;
      const snap = await getDocs(collection(db, "creators", user.uid, "datasets"));
      const all = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Dataset) }));
      setDatasets(all);
      const def = all.find((d) => d.id === "default") || all[0];
      if (def) setSelectedDatasetId(def.id);
    }
    fetchDatasets();
  }, [user]);

  // When selectedDatasetId changes, load its config + drawings
  useEffect(() => {
    async function loadDataset() {
      if (!user || !selectedDatasetId) return;
      // share link
      setShareUrl(`${window.location.origin}/draw/${user.uid}/${selectedDatasetId}`);
      // config
      const ref = doc(db, "creators", user.uid, "datasets", selectedDatasetId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data() as Dataset;
        setPrompts(data.prompts || []);
        setOutputSize(data.outputSize || 28);
        setIsOpen(data.isOpen || false);
        setShuffleMode(data.shuffleMode || false);
      }
      // drawings & stats
      const q = query(
        collection(db, "drawings"),
        where("creatorId", "==", user.uid),
        where("datasetId", "==", selectedDatasetId)
      );
      const dsnap = await getDocs(q);
      const fetched = dsnap.docs.map((d) => ({ id: d.id, ...(d.data() as Drawing) }));
      setDrawings(fetched);
      const counts: Record<string, number> = {};
      let last: Date | null = null;
      for (const d of fetched) {
        counts[d.prompt] = (counts[d.prompt] || 0) + 1;
        if (d.createdAt?.toDate) {
          const t = d.createdAt.toDate();
          if (!last || t > last) last = t;
        }
      }
      setStats({ total: fetched.length, perPrompt: counts, lastTime: last });
      setLoading(false);
    }
    loadDataset();
  }, [selectedDatasetId, user]);

  // Helpers
  const validatePrompts = (): boolean => {
    if (prompts.length === 0) {
      alert("You must have at least one prompt.");
      return false;
    }
    for (let i = 0; i < prompts.length; i++) {
      if (!prompts[i].label.trim()) {
        alert(`Prompt ${i + 1} is missing a label.`);
        return false;
      }
    }
    return true;
  };

  async function saveToFirestore(newData: Partial<Dataset> = {}, skipVal = false) {
    if (!user || !selectedDatasetId) return;
    if (!skipVal && !validatePrompts()) return;
    const ref = doc(db, "creators", user.uid, "datasets", selectedDatasetId);
    await setDoc(ref, { prompts, outputSize, isOpen, shuffleMode, ...newData }, { merge: true });
  }

  const handleLogout = async () => {
    await signOut(auth);
    window.location.href = "/login";
  };
  const handleCreateDataset = async () => {
    if (!user) return;
    const id = uuidv4();
    const ref = doc(db, "creators", user.uid, "datasets", id);
    const newDs: Dataset = { id, name: "Untitled Dataset", prompts: [], outputSize: 28, isOpen: false };
    await setDoc(ref, newDs);
    setDatasets((d) => [...d, newDs]);
    setSelectedDatasetId(id);
  };
  const handleDeleteDataset = async () => {
    if (!user || !selectedDatasetId) return;
    if (!confirm("Are you sure you want to delete this dataset?")) return;
    await deleteDoc(doc(db, "creators", user.uid, "datasets", selectedDatasetId));
    const rem = datasets.filter((d) => d.id !== selectedDatasetId);
    setDatasets(rem);
    setSelectedDatasetId(rem[0]?.id || "");
  };

  const addPrompt = () => {
    setPrompts((p) => {
      const next = [...p, { label: "", description: "", exampleImage: null }];
      saveToFirestore({ prompts: next }, true);
      return next;
    });
  };
  const removePrompt = (i: number) => {
    setPrompts((p) => {
      const next = p.filter((_, idx) => idx !== i);
      saveToFirestore({ prompts: next }, true);
      return next;
    });
  };
  const handleFieldChange = (
    i: number,
    field: keyof Prompt,
    val: string | null
  ) => {
    setPrompts((p) => {
      const next = [...p];
      // @ts-ignore
      next[i][field] = val;
      saveToFirestore({ prompts: next }, true);
      return next;
    });
  };
  const handleOutputSizeChange = (val: string) => {
    const size = parseInt(val, 10);
    setOutputSize(size);
    saveToFirestore({ outputSize: size });
  };
  const handleIsOpenToggle = () => {
    const next = !isOpen;
    if (next && !validatePrompts()) return;
    setIsOpen(next);
    saveToFirestore({ isOpen: next });
  };
  const handleShuffleToggle = (val: boolean) => {
    setShuffleMode(val);
    saveToFirestore({ shuffleMode: val });
  };

  const handleExportCSV = (format: "pixels" | "base64") => {
    if (!drawings.length) return alert("No drawings.");
    const rows = drawings.map((d) => {
      if (format === "pixels") {
        const flat = d.imagePixels.flat();
        return {
          label: d.prompt,
          ...Object.fromEntries(flat.map((v, i) => [`pixel_${i}`, v])),
        };
      }
      return { label: d.prompt, imageBase64: d.imageBase64 };
    });
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    saveAs(blob, `dataset_${format}.csv`);
  };
  const handleDownloadZip = async () => {
    if (!drawings.length) return alert("No drawings.");
    const zip = new JSZip();
    const labels: { filename: string; label: string }[] = [];
    for (let i = 0; i < drawings.length; i++) {
      const d = drawings[i];
      const name = `img_${i + 1}.png`;
      labels.push({ filename: name, label: d.prompt });
      const data = d.imageBase64.split(",")[1];
      zip.file(name, data, { base64: true });
    }
    zip.file("labels.csv", Papa.unparse(labels));
    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, "dataset.zip");
  };
  const handleExportJSON = () => {
    if (!drawings.length) return alert("No drawings.");
    const data = drawings.map((d) => ({ label: d.prompt, pixels: d.imagePixels }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    saveAs(blob, "dataset.json");
  };

  if (loading) return <div style={{ padding: "2rem" }}>Loading dashboard...</div>;

  const selected = datasets.find((d) => d.id === selectedDatasetId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-green-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-green-800">DoodleVault</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCreateDataset}>
              <Plus className="mr-2 h-4 w-4" /> New Dataset
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" /> Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 grid lg:grid-cols-3 gap-8">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dataset Settings */}
          <Card className="border-green-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-green-600" /> Dataset Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Select Dataset</Label>
                <Select value={selectedDatasetId} onValueChange={setSelectedDatasetId}>
                  <SelectTrigger className="border-green-200 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-green-200">
                    {datasets.map((ds) => (
                      <SelectItem key={ds.id} value={ds.id}>
                        {ds.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Dataset Name</Label>
                <Input
                  value={selected?.name || ""}
                  onChange={async (e) => {
                    const name = e.target.value;
                    setDatasets((d) => d.map((x) => (x.id === selectedDatasetId ? { ...x, name } : x)));
                    await setDoc(
                      doc(db, "creators", user!.uid, "datasets", selectedDatasetId),
                      { name },
                      { merge: true }
                    );
                  }}
                  className="border-green-200"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="flex items-center gap-2">
                    {isOpen ? (
                      <Unlock className="h-4 w-4 text-green-600" />
                    ) : (
                      <Lock className="h-4 w-4 text-gray-400" />
                    )}
                    {isOpen ? "Open for submissions" : "Closed to submissions"}
                  </Label>
                </div>
                <Switch checked={isOpen} onCheckedChange={handleIsOpenToggle} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="flex items-center gap-2">
                    <Shuffle className={`h-4 w-4 ${shuffleMode ? "text-green-600" : "text-gray-400"}`} /> Shuffle Mode
                  </Label>
                </div>
                <Switch checked={shuffleMode} onCheckedChange={handleShuffleToggle} />
              </div>
            </CardContent>
          </Card>

          {/* Drawing Prompts */}
          <Card className="border-green-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-green-600" /> Drawing Prompts
              </CardTitle>
              <CardDescription>Create prompts for contributors to draw</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <DragDropContext
                onDragEnd={({ source, destination }) => {
                  if (!destination) return;
                  const reordered = Array.from(prompts);
                  const [moved] = reordered.splice(source.index, 1);
                  reordered.splice(destination.index, 0, moved);
                  setPrompts(reordered);
                  saveToFirestore({ prompts: reordered }, true);
                }}
              >
                <Droppable droppableId="prompts">
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-4">
                      {prompts.map((p, i) => (
                        <Draggable key={i} draggableId={`p-${i}`} index={i}>
                          {(prov) => (
                            <div
                              ref={prov.innerRef}
                              {...prov.draggableProps}
                              {...prov.dragHandleProps}
                              className="p-4 border border-green-100 rounded-lg bg-green-50/50"
                            >
                              <div className="flex justify-between items-center mb-2">
                                <Badge variant="outline" className="border-green-200 text-green-700">
                                  Prompt {i + 1}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:bg-red-50"
                                  onClick={() => removePrompt(i)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="space-y-3">
                                <div>
                                  <Label className="text-sm">Label *</Label>
                                  <Input
                                    value={p.label}
                                    placeholder="e.g., Draw a cat"
                                    onChange={(e) => handleFieldChange(i, "label", e.target.value)}
                                    className="border-green-200"
                                  />
                                </div>
                                <div>
                                  <Label className="text-sm">Description (optional)</Label>
                                  <Textarea
                                    rows={2}
                                    className="border-green-200 resize-none"
                                    value={p.description}
                                    onChange={(e) =>
                                      handleFieldChange(i, "description", e.target.value.slice(0, 200))
                                    }
                                  />
                                  <p className="text-xs text-gray-500 mt-1">
                                    {p.description.length}/200
                                  </p>
                                </div>
                                <div className="flex gap-3">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    id={`upload-${i}`}
                                    hidden
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (!file) return;
                                      const reader = new FileReader();
                                      reader.onloadend = () =>
                                        handleFieldChange(i, "exampleImage", reader.result as string);
                                      reader.readAsDataURL(file);
                                    }}
                                  />
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-green-200"
                                    onClick={() => document.getElementById(`upload-${i}`)?.click()}
                                  >
                                    <Upload className="h-4 w-4 mr-2" /> Upload Example
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-green-200"
                                    onClick={() => {
                                      setEditingPromptIndex(i);
                                      setIsModalOpen(true);
                                    }}
                                  >
                                    <Edit3 className="h-4 w-4 mr-2" /> Draw Example
                                  </Button>
                                </div>
                                {p.exampleImage && (
                                  <div className="mt-2">
                                    <img
                                      src={p.exampleImage}
                                      alt="example"
                                      className="max-w-[100px] border border-gray-300"
                                    />
                                    <div>
                                      <Button
                                        variant="link"
                                        size="sm"
                                        onClick={() => handleFieldChange(i, "exampleImage", null)}
                                      >
                                        Remove
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
              <Button
                variant="outline"
                className="w-full border-green-200 text-green-700 hover:bg-green-50"
                onClick={addPrompt}
              >
                <Plus className="h-4 w-4 mr-2" /> Add Prompt
              </Button>
            </CardContent>
          </Card>

          {/* Output Settings */}
          <Card className="border-green-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IconImage className="h-5 w-5 text-green-600" /> Output Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Label>Image Resolution</Label>
              <Select value={outputSize.toString()} onValueChange={handleOutputSizeChange}>
                <SelectTrigger className="border-green-200 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-green-200">
                  {[28, 32, 64, 128, 256].map((s) => (
                    <SelectItem key={s} value={s.toString()}>
                      {s} × {s} px
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Share & QR */}
          {isOpen && (
            <Card className="border-green-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IconQrCode className="h-5 w-5 text-green-600" /> Share Dataset
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Label>Link</Label>
                <div className="p-2 bg-gray-50 rounded border text-xs break-all">{shareUrl}</div>
                <div className="text-center">
                  <QRCode value={shareUrl} size={128} />
                  <p className="text-xs text-gray-500 mt-2">QR Code</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats */}
          <Card className="border-green-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-green-600" /> Dataset Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{stats.total}</div>
                <p className="text-sm text-gray-600">Total Submissions</p>
              </div>
              <Separator />
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Submissions / Prompt</p>
                {Object.entries(stats.perPrompt).length > 0 ? (
                  Object.entries(stats.perPrompt).map(([lab, cnt]) => (
                    <div key={lab} className="flex justify-between text-sm">
                      <span className="truncate">{lab}</span>
                      <span className="font-medium">{cnt}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm italic text-gray-500">No submissions yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Export */}
          <Card className="border-green-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5 text-green-600" /> Export Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start border-green-200"
                onClick={() => handleExportCSV("pixels")}
              >
                <Download className="mr-2 h-4 w-4" /> CSV (pixels)
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start border-green-200"
                onClick={() => handleExportCSV("base64")}
              >
                <Download className="mr-2 h-4 w-4" /> CSV (base64)
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start border-green-200"
                onClick={handleDownloadZip}
              >
                <Download className="mr-2 h-4 w-4" /> ZIP (PNGs + labels)
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start border-green-200"
                onClick={handleExportJSON}
              >
                <Download className="mr-2 h-4 w-4" /> JSON
              </Button>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <Trash2 className="h-5 w-5" /> Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" className="w-full" onClick={handleDeleteDataset}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete Dataset
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Draw Example Modal */}
      {isModalOpen && editingPromptIndex !== null && (
        <DrawExampleModal
          onSave={(base64) => {
            handleFieldChange(editingPromptIndex, "exampleImage", base64);
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
