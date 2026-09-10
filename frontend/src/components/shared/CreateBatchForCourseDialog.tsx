import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import axios from "axios";

export function CreateBatchForCourseDialog({ 
  open, 
  onOpenChange, 
  course,
  onCreated,
  apiPrefix = "super-admin"
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  course: any;
  onCreated?: () => void;
  apiPrefix?: "admin" | "super-admin";
}) {
  const [loading, setLoading] = useState(false);
  const [faculty, setFaculty] = useState<any[]>([]);
  const [formData, setFormData] = useState({ 
    name: "", 
    batch_code: "", 
    start_date: "", 
    end_date: "", 
    assigned_faculty_id: "" 
  });

  useEffect(() => {
    if (open) {
      axios.get(`http://localhost:8000/api/v1/${apiPrefix}/faculty`, { withCredentials: true })
        .then(res => setFaculty(res.data))
        .catch(console.error);
    }
  }, [open, apiPrefix]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`http://localhost:8000/api/v1/${apiPrefix}/batches`, {
        name: formData.name,
        batch_code: formData.batch_code,
        start_date: formData.start_date,
        end_date: formData.end_date,
        course_id: course.id,
        assigned_faculty_id: formData.assigned_faculty_id ? parseInt(formData.assigned_faculty_id) : null
      }, { withCredentials: true });
      toast.success("Batch created successfully!");
      onOpenChange(false);
      setFormData({ name: "", batch_code: "", start_date: "", end_date: "", assigned_faculty_id: "" });
      if (onCreated) onCreated();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to create batch");
    } finally {
      setLoading(false);
    }
  };

  if (!course) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-background border-border">
        <DialogHeader>
          <DialogTitle className="font-display">Create Batch for {course.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Batch Name</Label>
            <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Fall 2026" />
          </div>
          <div className="space-y-2">
            <Label>Batch Code</Label>
            <Input required value={formData.batch_code} onChange={e => setFormData({...formData, batch_code: e.target.value})} placeholder="e.g. FALL26" />
          </div>
          <div className="space-y-2">
            <Label>Assign Faculty (Optional)</Label>
            <Select value={formData.assigned_faculty_id} onValueChange={(val) => setFormData({...formData, assigned_faculty_id: val})}>
              <SelectTrigger>
                <SelectValue placeholder="Select faculty..." />
              </SelectTrigger>
              <SelectContent>
                {faculty.map(f => (
                  <SelectItem key={f.id} value={f.id.toString()}>{f.username} ({f.email})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" required value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" required value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} />
            </div>
          </div>
          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Batch"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
