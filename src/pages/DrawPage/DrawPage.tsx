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
import Canvas, { CanvasRef } from "../../components/Canvas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Loader2, Palette, Send, RotateCcw, Lock, CheckCircle, XCircle, Minus, Plus, Brush, Eraser, Settings } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

export default function DrawPage() {
  const { creatorId, datasetId } = useParams();
  const canvasRef = useRef<CanvasRef>(null);
  const [creatorData, setCreatorData] = useState<any>(null);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [brushSize, setBrushSize] = useState(25);
  const [tool, setTool] = useState<'brush' | 'eraser'>('brush');

  useEffect(() => {
    const fetchCreator = async () => {
      if (!creatorId || !datasetId) return;
  
      try {
        const docRef = doc(db, "creators", creatorId, "datasets", datasetId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();

          // If shuffleMode is true, shuffle the prompts
          const prompts = data.prompts || [];
          if (data.shuffleMode) {
            data.prompts = [...prompts].sort(() => Math.random() - 0.5);
          }

          setCreatorData(data);
          console.log("Fetched dataset:", data);
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

    setSubmitting(true);
    
    try {
      const exportData = await canvasRef.current.exportPaths();
      if (!exportData || exportData.length === 0) {
        toast({
          title: "No drawing found",
          description: "Please draw something before submitting.",
          variant: "destructive"
        });
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
        ctx?.drawImage(img, 0, 0, size, size);

        const imageData = ctx?.getImageData(0, 0, size, size);
        const pixels: number[] = [];

        if (imageData) {
          for (let i = 0; i < imageData.data.length; i += 4) {
            const grayscale = imageData.data[i]; // red channel as grayscale
            pixels.push(grayscale / 255);
          }
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

        canvasRef.current?.clearCanvas();
        setCurrentPromptIndex((prev) => prev + 1);
      };
    } catch (error) {
      console.error("Error submitting drawing:", error);
      toast({
        title: "Error",
        description: "Failed to submit drawing. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-green-600 mb-4" />
            <p className="text-lg font-medium text-slate-700">Loading dataset...</p>
            <p className="text-sm text-slate-500 mt-2 text-center">Please wait while we fetch your drawing prompts</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!creatorData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <XCircle className="h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold text-slate-800 mb-2">Dataset Not Found</h2>
            <p className="text-slate-600 text-center">
              The dataset you're looking for doesn't exist or the link is invalid.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!creatorData.isOpen) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Lock className="h-12 w-12 text-amber-500 mb-4" />
            <h2 className="text-xl font-semibold text-slate-800 mb-2">Submissions Closed</h2>
            <p className="text-slate-600 text-center">
              This dataset is currently closed to new submissions. Please check back later.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentPromptIndex >= creatorData.prompts.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <CheckCircle className="h-12 w-12 text-green-600 mb-4" />
            <h2 className="text-xl font-semibold text-slate-800 mb-2">All Done!</h2>
            <p className="text-slate-600 text-center">
              Thank you for submitting all your drawings! Your contributions help improve AI research.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentPrompt = creatorData.prompts[currentPromptIndex];
  const label =
    typeof currentPrompt === "string"
      ? currentPrompt
      : currentPrompt.label || `Prompt ${currentPromptIndex + 1}`;
  const description =
    typeof currentPrompt === "object" ? currentPrompt.description : "";

  // Calculate progress based on completed drawings (currentPromptIndex represents completed drawings)
  const progress = (currentPromptIndex / creatorData.prompts.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-background border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Palette className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">DoodleVault Drawing</h1>
                <p className="text-sm text-muted-foreground">{creatorData.name || 'Drawing Dataset'}</p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
              {currentPromptIndex + 1} of {creatorData.prompts.length}
            </Badge>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="container mx-auto px-4 pt-6">
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-foreground">Progress</span>
                <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                  {currentPromptIndex} of {creatorData.prompts.length} completed
                </Badge>
              </div>
              <span className="text-sm font-medium text-green-600">{Math.round(progress)}% complete</span>
            </div>
            <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="absolute top-0 left-0 h-full bg-green-500 transition-all duration-500 ease-out rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="container mx-auto px-4 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
          {/* Left Column: Prompt + Example */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            {/* Drawing Prompt */}
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Palette className="h-5 w-5 text-green-600" />
                  <span>Drawing Prompt</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <h3 className="text-3xl font-bold text-foreground mb-4">{label}</h3>
                {description && (
                  <p className="text-muted-foreground text-lg leading-relaxed">{description}</p>
                )}
              </CardContent>
            </Card>

            {/* Example Drawing */}
            {typeof currentPrompt === "object" && currentPrompt.exampleImage && (
              <Card className="h-fit">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <div className="h-5 w-5 text-blue-600 flex items-center justify-center">📷</div>
                    <span>Example Drawing</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative bg-slate-50 rounded-lg p-4">
                    <img
                      src={currentPrompt.exampleImage}
                      alt="Example drawing"
                      className="w-full max-w-sm mx-auto rounded-lg border border-border shadow-sm"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-4 text-center">
                    Use this as inspiration for your drawing
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column: Canvas + Controls */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {/* Drawing Canvas Card */}
            <Card className="h-fit">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Drawing Canvas</CardTitle>
                  <div className="flex items-center gap-3">
                    <Button
                      variant={tool === 'brush' ? 'default' : 'ghost'}
                      size="icon"
                      style={{
                        borderRadius: '50%',
                        width: 36,
                        height: 36,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: tool === 'brush' ? '#22c55e' : '#f3f4f6',
                        color: '#fff',
                        border: tool === 'brush' ? '2px solid #22c55e' : 'none',
                        boxShadow: 'none',
                        transition: 'background 0.2s',
                        padding: 0,
                        position: 'relative',
                        cursor: 'pointer',
                      }}
                      aria-label={tool === 'brush' ? 'Brush (active)' : 'Brush'}
                      onClick={() => setTool('brush')}
                    >
                      <Brush size={18} color={tool === 'brush' ? '#fff' : '#22c55e'} />
                    </Button>
                    <Button
                      variant={tool === 'eraser' ? 'default' : 'ghost'}
                      size="icon"
                      style={{
                        borderRadius: '50%',
                        width: 36,
                        height: 36,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: tool === 'eraser' ? '#f87171' : '#f3f4f6',
                        color: tool === 'eraser' ? '#fff' : '#222',
                        border: tool === 'eraser' ? '2px solid #f87171' : 'none',
                        boxShadow: 'none',
                        transition: 'background 0.2s',
                        padding: 0,
                        position: 'relative',
                        cursor: 'pointer',
                      }}
                      aria-label={tool === 'eraser' ? 'Eraser (active)' : 'Eraser'}
                      onClick={() => setTool('eraser')}
                    >
                      <Eraser size={18} color={tool === 'eraser' ? '#fff' : '#f87171'} />
                    </Button>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          style={{
                            borderRadius: '50%',
                            width: 36,
                            height: 36,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#f3f4f6',
                            color: '#222',
                            border: 'none',
                            boxShadow: 'none',
                            transition: 'background 0.2s',
                            padding: 0,
                            position: 'relative',
                            cursor: 'pointer',
                          }}
                          aria-label="Adjust tool size"
                        >
                          <Settings size={18} />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="end" sideOffset={8} style={{
                        width: 220,
                        padding: 20,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        zIndex: 9999,
                        background: '#fff',
                        border: '1.5px solid #e5e7eb',
                        borderRadius: 12,
                        boxShadow: '0 4px 24px #0002',
                      }}>
                        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 10 }}>Tool Size</div>
                        {/* Live preview of stroke */}
                        <div style={{ width: '100%', display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                          <span style={{ fontSize: 13, color: '#888', minWidth: 40 }}>{brushSize}px</span>
                          <svg width="100" height="24" style={{ margin: '0 8px' }}>
                            <line x1="0" y1="12" x2="100" y2="12" stroke={tool === 'brush' ? '#22c55e' : '#f87171'} strokeWidth={brushSize} strokeLinecap="round" />
                          </svg>
                        </div>
                        {/* Slider */}
                        <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontSize: 12, color: '#888' }}>Thin</span>
                          <Slider
                            value={[brushSize]}
                            onValueChange={(value) => {
                              const newSize = value[0];
                              setBrushSize(newSize);
                              canvasRef.current?.setBrushSize(newSize);
                            }}
                            min={5}
                            max={25}
                            step={1}
                            style={{ flex: 1 }}
                            aria-label="Tool size slider"
                            brushSize={brushSize}
                          />
                          <span style={{ fontSize: 12, color: '#888' }}>Thick</span>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center">
                  <div
                    style={{
                      background: "#fff",
                      borderRadius: 14,
                      boxShadow: "0 2px 8px #0001",
                      border: "2px solid #e5e7eb",
                      padding: 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 320,
                      aspectRatio: '1/1',
                      maxWidth: '90vw',
                      maxHeight: '60vw',
                    }}
                  >
                    <div style={{ width: '100%', height: '100%', aspectRatio: '1/1', position: 'relative' }}>
                      <Canvas ref={canvasRef} brushSize={brushSize} width={300} height={300} isEraser={tool === 'eraser'} />
                    </div>
                  </div>
                </div>
              </CardContent>
              {/* Footer Bar: Submit and Clear */}
              <div className="flex flex-row gap-4 w-full px-6 pb-6">
                <Button
                  onClick={handleSubmitDrawing}
                  disabled={submitting}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white h-12 text-lg"
                  size="lg"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-5 w-5" />
                      Submit Drawing
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => canvasRef.current?.clearCanvas()}
                  variant="outline"
                  size="lg"
                  disabled={submitting}
                  className="h-12 text-lg"
                >
                  <RotateCcw className="mr-2 h-5 w-5" />
                  Clear Canvas
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
