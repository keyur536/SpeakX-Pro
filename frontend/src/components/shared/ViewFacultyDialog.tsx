import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pause, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

export function ViewFacultyDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const [faculty, setFaculty] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFaculty = () => {
    setLoading(true);
    axios.get("http://localhost:8000/api/v1/super-admin/faculty", { withCredentials: true })
      .then(res => setFaculty(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (open) {
      fetchFaculty();
    }
  }, [open]);

  const handlePauseToggle = async (facultyId: number, currentStatus: string) => {
    const newStatus = currentStatus === "hold" ? "approved" : "hold";
    try {
      await axios.put(`http://localhost:8000/api/v1/super-admin/users/${facultyId}/status`, 
        { status: newStatus },
        { withCredentials: true }
      );
      toast.success(`Account ${newStatus === "hold" ? "paused" : "resumed"}`);
      fetchFaculty();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (facultyId: number) => {
    if (!confirm("Are you sure you want to completely delete this account? This cannot be undone.")) return;
    
    try {
      await axios.delete(`http://localhost:8000/api/v1/super-admin/faculty/${facultyId}`, { withCredentials: true });
      toast.success("Account deleted");
      fetchFaculty();
    } catch (error) {
      toast.error("Failed to delete account");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-background border-border max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">All Admins & Faculty Members</DialogTitle>
        </DialogHeader>
        <div className="pt-4">
          {loading && faculty.length === 0 ? (
            <p className="text-muted-foreground font-sans">Loading data...</p>
          ) : (
            <div className="border border-border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {faculty.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center font-sans text-muted-foreground py-6">
                        No admins or faculty members found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    faculty.map(f => (
                      <TableRow key={f.id} className={f.status === 'hold' ? "opacity-50" : ""}>
                        <TableCell className="font-mono">{f.username}</TableCell>
                        <TableCell className="font-sans">{f.email}</TableCell>
                        <TableCell className="font-sans capitalize">{f.role}</TableCell>
                        <TableCell className="font-mono text-accent capitalize">{f.status}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => handlePauseToggle(f.id, f.status)}
                            title={f.status === 'hold' ? "Resume Account" : "Pause Account"}
                          >
                            {f.status === 'hold' ? <Play className="h-4 w-4 text-green-500" /> : <Pause className="h-4 w-4 text-amber-500" />}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8 hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => handleDelete(f.id)}
                            title="Delete Account"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
