import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UploadCloud, CheckCircle2, Loader2, Video, Camera, StopCircle } from "lucide-react";

interface AnalysisResult {
  id: number;
  overall_score: number;
  confidence_score: number;
  fluency_score: number;
  english_proficiency_score: number;
  communication_impact_score: number;
  vocal_engagement_score: number;
  physical_presence_score: number;
  wpm: number;
  eye_contact_pct: number;
  grammar_mistakes: string;
  feedback: string;
  transcription: string;
}

export default function AnalyzeSession() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Recording states
  const [mode, setMode] = useState<"upload" | "record">("upload");
  const [isRecording, setIsRecording] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
      setError("");
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post("http://127.0.0.1:8000/api/v1/sessions/analyze", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setResult(response.data);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || "An error occurred during analysis.");
    } finally {
      setLoading(false);
    }
  };

  // Recording Logic
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const recordedFile = new File([blob], "recorded_session.webm", { type: "video/webm" });
        setFile(recordedFile);
        
        // Stop camera
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setFile(null);
      setResult(null);
      setError("");
    } catch (err) {
      console.error("Error accessing media devices.", err);
      setError("Could not access camera or microphone. Please allow permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleModeChange = (newMode: "upload" | "record") => {
    if (isRecording) stopRecording();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setMode(newMode);
    setFile(null);
    setError("");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">New Session</h2>
          <p className="text-muted-foreground mt-2">
            Upload or record a video of yourself speaking to get instant AI-powered feedback.
          </p>
        </div>
        <div className="flex space-x-2 bg-muted p-1 rounded-lg">
          <Button 
            variant={mode === "upload" ? "default" : "ghost"} 
            size="sm" 
            onClick={() => handleModeChange("upload")}
            className="flex items-center"
          >
            <UploadCloud className="w-4 h-4 mr-2" /> Upload Video
          </Button>
          <Button 
            variant={mode === "record" ? "default" : "ghost"} 
            size="sm" 
            onClick={() => handleModeChange("record")}
            className="flex items-center"
          >
            <Camera className="w-4 h-4 mr-2" /> Record Live
          </Button>
        </div>
      </div>

      <Card className="border-dashed border-2 bg-muted/30">
        <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
          
          {mode === "upload" && (
            <>
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <UploadCloud className="w-10 h-10 text-primary" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="font-semibold text-lg">
                  {file ? file.name : "Drag and drop your video"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  MP4, WebM, or MOV up to 50MB
                </p>
              </div>
              
              <input 
                type="file" 
                accept="video/*" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileChange}
              />

              <div className="flex space-x-4 pt-4">
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={loading}>
                  Choose File
                </Button>
                <Button onClick={handleUpload} disabled={!file || loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...
                    </>
                  ) : "Upload & Analyze"}
                </Button>
              </div>
            </>
          )}

          {mode === "record" && (
            <div className="w-full flex flex-col items-center space-y-6">
              <div className="relative w-full max-w-2xl aspect-video bg-black rounded-xl overflow-hidden border border-border shadow-lg">
                {!isRecording && !file && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50">
                    <Camera className="w-16 h-16 mb-4 opacity-50" />
                    <p>Camera is off</p>
                  </div>
                )}
                
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className={`w-full h-full object-cover ${(!isRecording && !file) ? 'hidden' : ''}`} 
                />

                {isRecording && (
                  <div className="absolute top-4 right-4 flex items-center bg-black/50 px-3 py-1.5 rounded-full text-white text-sm">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse mr-2" />
                    Recording
                  </div>
                )}
                
                {file && !isRecording && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white">
                    <div className="text-center">
                      <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-2" />
                      <p className="font-medium">Video Recorded Successfully</p>
                      <p className="text-sm text-gray-300 mt-1">{file.size > 0 ? (file.size / (1024 * 1024)).toFixed(2) : 0} MB</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex space-x-4">
                {!isRecording && !file && (
                  <Button onClick={startRecording} size="lg" className="bg-red-500 hover:bg-red-600 text-white">
                    <Camera className="w-5 h-5 mr-2" /> Start Recording
                  </Button>
                )}
                
                {isRecording && (
                  <Button onClick={stopRecording} size="lg" variant="destructive">
                    <StopCircle className="w-5 h-5 mr-2" /> Stop Recording
                  </Button>
                )}
                
                {file && !isRecording && (
                  <>
                    <Button variant="outline" onClick={startRecording} disabled={loading}>
                      Retake
                    </Button>
                    <Button onClick={handleUpload} disabled={loading} size="lg">
                      {loading ? (
                        <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Analyzing...</>
                      ) : "Analyze Recording"}
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}

          {error && <p className="text-destructive font-medium mt-4">{error}</p>}
        </CardContent>
      </Card>

      {/* Results Section */}
      {result && (
        <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-700">
          <h3 className="text-2xl font-bold flex items-center">
            <CheckCircle2 className="w-6 h-6 text-green-500 mr-2" />
            Analysis Complete
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Overall Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-primary">{result.overall_score}/100</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Speaking Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{result.wpm}</div>
                <p className="text-xs text-muted-foreground">Words per minute</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Eye Contact</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{result.eye_contact_pct}%</div>
                <p className="text-xs text-muted-foreground">Looking at camera</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Detailed Breakdown</CardTitle>
              <CardDescription>How your overall score was calculated</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Confidence</p>
                  <p className="text-2xl font-bold">{result.confidence_score}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Fluency</p>
                  <p className="text-2xl font-bold">{result.fluency_score}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">English Proficiency</p>
                  <p className="text-2xl font-bold">{result.english_proficiency_score}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Communication Impact</p>
                  <p className="text-2xl font-bold">{result.communication_impact_score}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Vocal Engagement</p>
                  <p className="text-2xl font-bold">{result.vocal_engagement_score}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Physical Presence</p>
                  <p className="text-2xl font-bold">{result.physical_presence_score}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detailed Feedback</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2">AI Coach Comments:</h4>
                <p className="text-muted-foreground bg-muted p-4 rounded-md leading-relaxed whitespace-pre-wrap">
                  {result.feedback}
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2 text-destructive">Grammar & Adjustments:</h4>
                <p className="text-muted-foreground leading-relaxed">
                  {result.grammar_mistakes || "Perfect! No major grammar mistakes detected."}
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Transcription:</h4>
                <p className="text-sm text-muted-foreground italic bg-muted/50 p-4 rounded-md">
                  "{result.transcription}"
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
