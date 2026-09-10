import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { StudentRosterTable } from "@/components/shared/StudentRosterTable";
import { AddStudentDialog } from "@/components/shared/AddStudentDialog";

export default function AdminBatchDetailsPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const [batch, setBatch] = useState<any>(null);
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [batchesRes, coursesRes] = await Promise.all([
          axios.get("http://localhost:8000/api/v1/admin/batches", { withCredentials: true }),
          axios.get("http://localhost:8000/api/v1/admin/courses", { withCredentials: true })
        ]);
        
        const foundBatch = batchesRes.data.find((b: any) => b.id.toString() === batchId);
        setBatch(foundBatch);

        if (foundBatch) {
          const foundCourse = coursesRes.data.find((c: any) => c.id === foundBatch.course_id);
          setCourse(foundCourse);
        }
      } catch (err) {
        console.error("Failed to load batch details", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [batchId]);

  if (loading) return <div className="p-8 font-sans">Loading batch details...</div>;
  if (!batch) return <div className="p-8 font-sans">Batch not found or access denied.</div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 border-b border-border pb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-grow">
          <h1 className="font-display font-bold text-3xl tracking-tight text-foreground">{batch.name}</h1>
          <p className="font-mono text-xs text-primary">{batch.batch_code} {course ? `| ${course.name}` : ""}</p>
        </div>
        <div className="shrink-0">
          <AddStudentDialog 
            batchId={parseInt(batchId!)} 
            onAdded={() => setRefreshKey(prev => prev + 1)} 
          />
        </div>
      </div>

      <div className="bg-card border border-border rounded-[1rem] p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="font-sans font-semibold text-xl">Enrolled Students</h2>
        </div>

        {/* We use a refreshKey trick to force the StudentRosterTable to re-fetch when a new student is added */}
        <div key={refreshKey}>
          <StudentRosterTable 
            fetchUrl={`/api/v1/admin/batches/${batchId}/students`}
            sessionFetchUrl={`/api/v1/admin/batches/${batchId}/students`}
          />
        </div>
      </div>
    </div>
  );
}
