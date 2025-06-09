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
import { Loader2, Palette, Send, RotateCcw, Lock, CheckCircle, XCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function DrawPage() {
  const { creatorId, datasetId } = useParams();
  const canvasRef = useRef<CanvasRef>(null);
  const [creatorData, setCreatorData] = useState<any>(null);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Progress Section */}
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

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Left Column - Prompt Info */}
          <div className="space-y-6">
            {/* Current Prompt */}
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

            {/* Example Image */}
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

          {/* Right Column - Drawing Canvas */}
          <div className="space-y-6 flex flex-col h-full">
            {/* Canvas */}
            <Card className="h-fit">
              <CardHeader>
                <CardTitle>Drawing Canvas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center">
                  <div className="bg-white rounded-xl p-6 shadow-inner border-2 border-slate-200">
                    <Canvas ref={canvasRef} width={400} height={400} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <Card className="flex-1 flex flex-col">
              <CardContent className="p-6 flex flex-col flex-1">
                <div className="flex flex-col sm:flex-row gap-4">
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
                <Separator className="my-4" />
                <p className="text-sm text-muted-foreground text-center leading-relaxed mt-auto">
                  Draw your interpretation of the prompt above, then submit to continue to the next one.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
