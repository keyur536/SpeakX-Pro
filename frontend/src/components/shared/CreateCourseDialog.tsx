import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import axios from "axios";

export function CreateCourseDialog({ onCreated }: { onCreated?: (course: any) => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [admins, setAdmins] = useState<any[]>([]);
  const [formData, setFormData] = useState({ name: "", description: "", assigned_admin_id: "" });

  useEffect(() => {
    if (open) {
      axios.get("http://localhost:8000/api/v1/super-admin/admins", { withCredentials: true })
        .then(res => setAdmins(res.data))
        .catch(console.error);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const code = formData.name.toUpperCase().replace(/\s+/g, '-').substring(0, 10);
      const payload = {
        name: formData.name,
        code: code,
        description: formData.description,
        duration_months: 6,
        assigned_admin_id: formData.assigned_admin_id ? parseInt(formData.assigned_admin_id) : null
      };
      
      const res = await axios.post("http://localhost:8000/api/v1/super-admin/courses", payload, { withCredentials: true });
      toast.success("Course created successfully!");
      setOpen(false);
      setFormData({ name: "", description: "", assigned_admin_id: "" });
      if (onCreated) onCreated(res.data);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to create course");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="font-sans">+ Create Course</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-background border-border">
        <DialogHeader>
          <DialogTitle className="font-display">Create New Course</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Course Name</Label>
            <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Intro to Communications" />
          </div>
          <div className="space-y-2">
            <Label>Assign Admin</Label>
            <Select value={formData.assigned_admin_id} onValueChange={(val) => setFormData({...formData, assigned_admin_id: val})}>
              <SelectTrigger>
                <SelectValue placeholder="Select an admin..." />
              </SelectTrigger>
              <SelectContent>
                {admins.map(admin => (
                  <SelectItem key={admin.id} value={admin.id.toString()}>{admin.username} ({admin.email})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Optional brief description" />
          </div>
          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Course"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
