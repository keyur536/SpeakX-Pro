import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import axios from "axios";

export function AddFacultyDialog({ onAdded }: { onAdded?: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [faculty, setFaculty] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [formData, setFormData] = useState({ faculty_id: "", batch_id: "" });

  useEffect(() => {
    if (open) {
      Promise.all([
        axios.get("http://localhost:8000/api/v1/admin/faculty", { withCredentials: true }),
        axios.get("http://localhost:8000/api/v1/admin/batches", { withCredentials: true })
      ]).then(([facRes, batchRes]) => {
        setFaculty(facRes.data);
        setBatches(batchRes.data);
      }).catch(() => toast.error("Failed to load data"));
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`http://localhost:8000/api/v1/admin/batches/${formData.batch_id}/faculty`, {
        faculty_id: parseInt(formData.faculty_id)
      }, { withCredentials: true });
      toast.success("Faculty assigned successfully!");
      setOpen(false);
      if (onAdded) onAdded();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to assign faculty");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="font-sans">+ Add Faculty</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-background border-border">
        <DialogHeader>
          <DialogTitle className="font-display">Assign Faculty to Batch</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Faculty Member</Label>
            <Select onValueChange={(val) => setFormData({...formData, faculty_id: val})}>
              <SelectTrigger>
                <SelectValue placeholder="Select faculty" />
              </SelectTrigger>
              <SelectContent>
                {faculty.map(f => (
                  <SelectItem key={f.id} value={f.id.toString()}>{f.username} ({f.email})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Assign to Batch</Label>
            <Select onValueChange={(val) => setFormData({...formData, batch_id: val})}>
              <SelectTrigger>
                <SelectValue placeholder="Select batch" />
              </SelectTrigger>
              <SelectContent>
                {batches.map(b => (
                  <SelectItem key={b.id} value={b.id.toString()}>{b.name} ({b.batch_code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={loading || !formData.faculty_id || !formData.batch_id}>{loading ? "Assigning..." : "Assign Faculty"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
