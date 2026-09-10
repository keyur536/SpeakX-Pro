import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { CreateCourseDialog } from "@/components/shared/CreateCourseDialog";
import { Button } from "@/components/ui/button";
import { Activity } from "lucide-react";

export default function SuperAdminCourses() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<any[]>([]);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await axios.get("http://localhost:8000/api/v1/super-admin/courses", { withCredentials: true });
        setCourses(res.data);
      } catch (err) {
        console.error("Failed to load courses", err);
      }
    };
    fetchCourses();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl tracking-tight text-foreground">Course Management</h1>
          <p className="font-sans text-muted-foreground">View and create courses across the platform.</p>
        </div>
        <div className="flex items-center gap-3">
          <CreateCourseDialog onCreated={(course) => setCourses(prev => [course, ...prev])} />
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {courses.map((course: any, idx: number) => (
            <div 
              key={idx} 
              className="bg-card border border-primary/50 shadow-[0_0_15px_rgba(45,212,191,0.1)] rounded-[1rem] p-5 relative overflow-hidden flex flex-col h-full cursor-pointer hover:border-primary transition-colors"
              onClick={() => navigate(`/super-admin/courses/${course.id}`)}
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <Activity className="w-16 h-16 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-lg text-foreground">{course.name}</h3>
              <p className="font-mono text-xs text-primary mt-1 mb-3">{course.code}</p>
              <p className="font-sans text-sm text-muted-foreground line-clamp-3 mb-4 flex-grow">
                {course.description || "No description provided."}
              </p>
              <div className="mt-auto pt-4 border-t border-border flex justify-between items-center mb-4">
                <span className="font-sans text-xs text-muted-foreground">Duration: {course.duration_months} Months</span>
                {course.assigned_admin_id && <span className="font-sans text-xs text-accent">Admin: {course.assigned_admin_name || "Assigned"}</span>}
              </div>
            </div>
          ))}
          {courses.length === 0 && (
            <div className="col-span-full py-12 text-center border border-dashed border-border rounded-xl">
              <p className="text-muted-foreground font-sans">No courses found. Create your first course above.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
