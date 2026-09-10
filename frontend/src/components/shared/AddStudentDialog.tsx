import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import axios from "axios";

export function AddStudentDialog({ 
  batchId, 
  onAdded,
  apiPrefix = "admin"
}: { 
  batchId: number; 
  onAdded?: () => void;
  apiPrefix?: "admin" | "super-admin";
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"manual" | "bulk">("manual");
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({ 
    username: "", 
    email: "", 
    password: "" 
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`http://localhost:8000/api/v1/${apiPrefix}/batches/${batchId}/students`, formData, { withCredentials: true });
      toast.success("Student added successfully!");
      setOpen(false);
      setFormData({ username: "", email: "", password: "" });
      if (onAdded) onAdded();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to add student");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return toast.error("Please select an Excel or CSV file");
    
    setLoading(true);
    const data = new FormData();
    data.append("file", file);
    
    try {
      const res = await axios.post(`http://localhost:8000/api/v1/${apiPrefix}/batches/${batchId}/students/bulk`, data, { 
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" }
      });
      toast.success(res.data.message || "Students added successfully!");
      if (res.data.errors?.length > 0) {
        toast.warning(`Some rows were skipped (already exist).`);
      }
      setOpen(false);
      setFile(null);
      if (onAdded) onAdded();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to bulk upload students");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="font-sans">+ Add Student(s)</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-background border-border">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center justify-between">
            Add Students
          </DialogTitle>
          <div className="flex space-x-2 pt-2">
            <Button 
              variant={mode === "manual" ? "default" : "outline"} 
              size="sm" 
              onClick={() => setMode("manual")}
              className="flex-1"
            >
              Manual Entry
            </Button>
            <Button 
              variant={mode === "bulk" ? "default" : "outline"} 
              size="sm" 
              onClick={() => setMode("bulk")}
              className="flex-1"
            >
              <Upload className="w-4 h-4 mr-2"/> Bulk Upload
            </Button>
          </div>
        </DialogHeader>

        {mode === "manual" ? (
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Username / Name</Label>
              <Input required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} placeholder="e.g. John Doe" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="student@example.com" />
            </div>
            <div className="space-y-2">
              <Label>Temporary Password</Label>
              <Input type="password" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="Enter temporary password" />
            </div>
            <div className="pt-4 flex justify-end">
              <Button type="submit" disabled={loading}>{loading ? "Adding..." : "Add Student"}</Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleBulkSubmit} className="space-y-4 pt-4">
             <div className="space-y-2">
                <Label>Upload Excel (.xlsx) or CSV</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors cursor-pointer relative">
                  <Input 
                    type="file" 
                    accept=".xlsx, .xls, .csv" 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                    id="file-upload"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                  <Label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-sm font-medium">
                      {file ? file.name : "Click to browse or drag file here"}
                    </span>
                    <span className="text-xs text-muted-foreground mt-1">
                      Must include columns: Name, Email, Password
                    </span>
                  </Label>
                </div>
             </div>
             <div className="pt-4 flex justify-end">
                <Button type="submit" disabled={loading || !file}>{loading ? "Uploading..." : "Upload File"}</Button>
             </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
