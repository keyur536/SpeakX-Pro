import { useState, useRef } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UploadCloud, CheckCircle2, Loader2, Video } from "lucide-react";

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null); // Reset previous results if any
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

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">New Session</h2>
        <p className="text-muted-foreground mt-2">
          Upload a video of yourself speaking to get instant AI-powered feedback on your performance.
        </p>
      </div>

      <Card className="border-dashed border-2 bg-muted/30">
        <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
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
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                "Upload & Analyze"
              )}
            </Button>
          </div>

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
