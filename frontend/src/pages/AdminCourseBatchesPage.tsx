import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen } from "lucide-react";
import { CreateBatchForCourseDialog } from "@/components/shared/CreateBatchForCourseDialog";

export default function AdminCourseBatchesPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<any>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [createMode, setCreateMode] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [coursesRes, batchesRes] = await Promise.all([
        axios.get("http://localhost:8000/api/v1/admin/courses", { withCredentials: true }),
        axios.get("http://localhost:8000/api/v1/admin/batches", { withCredentials: true })
      ]);
      const foundCourse = coursesRes.data.find((c: any) => c.id.toString() === id);
      setCourse(foundCourse);
      
      const courseBatches = batchesRes.data.filter((b: any) => b.course_id.toString() === id);
      setBatches(courseBatches);
    } catch (err) {
      console.error("Failed to load course details", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  if (loading) return <div className="p-8 font-sans">Loading course...</div>;
  if (!course) return <div className="p-8 font-sans">Course not found or access denied.</div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin")} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="font-display font-bold text-3xl tracking-tight text-foreground">{course.name}</h1>
          <p className="font-mono text-xs text-primary">{course.code}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-6">
        <p className="font-sans text-muted-foreground max-w-2xl">
          {course.description || "Manage all active and upcoming batches for this course."}
        </p>
        <Button onClick={() => setCreateMode(true)} className="font-sans shrink-0 shadow-lg shadow-primary/20">
          + Create Batch
        </Button>
      </div>

      <div className="space-y-4">
        {batches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {batches.map(batch => (
              <div 
                key={batch.id} 
                className="bg-card border border-border shadow-sm rounded-[1rem] p-5 flex flex-col justify-between cursor-pointer hover:border-primary transition-colors"
                onClick={() => navigate(`/admin/batches/${batch.id}`)}
              >
                <div>
                  <h4 className="font-semibold font-display text-xl text-foreground mb-1">{batch.name}</h4>
                  <p className="font-mono text-xs text-primary mb-4">{batch.batch_code}</p>
                </div>
                <div className="space-y-2 mt-auto">
                  <div className="flex justify-between items-center text-sm font-sans text-muted-foreground border-t border-border pt-3">
                    <span>Status</span>
                    <span className="text-foreground capitalize">{batch.status}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-sans text-muted-foreground">
                    <span>Starts</span>
                    <span className="text-foreground">{new Date(batch.start_date).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center border border-dashed border-border rounded-xl bg-card/30">
            <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-sans">No batches created for this course yet.</p>
          </div>
        )}
      </div>

      <CreateBatchForCourseDialog
        open={createMode}
        onOpenChange={setCreateMode}
        course={course}
        apiPrefix="admin"
        onCreated={() => {
          setCreateMode(false);
          fetchData();
        }}
      />
    </div>
  );
}
