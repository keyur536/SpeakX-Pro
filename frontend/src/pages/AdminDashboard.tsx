import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { StudentRosterTable } from "@/components/shared/StudentRosterTable";
import { AddFacultyDialog } from "@/components/shared/AddFacultyDialog";
import { Button } from "@/components/ui/button";
import { EntityCombobox } from "@/components/shared/EntityCombobox";
import { BookOpen } from "lucide-react";
import axios from "axios";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [selectedCourseId, setSelectedCourseId] = useState<number | undefined>();
  const [courses, setCourses] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);

  const fetchData = async () => {
    try {
      const [coursesRes, batchesRes] = await Promise.all([
        axios.get("http://localhost:8000/api/v1/admin/courses", { withCredentials: true }),
        axios.get("http://localhost:8000/api/v1/admin/batches", { withCredentials: true })
      ]);
      setCourses(coursesRes.data);
      setBatches(batchesRes.data);
    } catch (err) {
      console.error("Failed to load dashboard data", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-10 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight text-foreground mb-2">Course Management</h1>
          <p className="font-sans text-muted-foreground">Manage your assigned courses, batches, and student rosters.</p>
        </div>
        <div className="flex items-center gap-3">
          <AddFacultyDialog />
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="font-sans font-semibold text-xl">My Courses</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {courses.map((course: any, idx: number) => (
            <div 
              key={idx} 
              className="bg-card border border-primary/50 shadow-[0_0_15px_rgba(45,212,191,0.1)] rounded-[1rem] p-5 relative overflow-hidden flex flex-col h-full cursor-pointer hover:border-primary transition-colors"
              onClick={() => navigate(`/admin/courses/${course.id}`)}
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <BookOpen className="w-16 h-16 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-lg text-foreground">{course.name}</h3>
              <p className="font-mono text-xs text-primary mt-1 mb-3">{course.code}</p>
              <p className="font-sans text-sm text-muted-foreground line-clamp-3 mb-4 flex-grow">
                {course.description || "No description provided."}
              </p>
              <div className="mt-auto pt-4 border-t border-border flex justify-between items-center mb-4">
                <span className="font-sans text-xs text-muted-foreground">Duration: {course.duration_months || 6} Months</span>
              </div>
              <Button variant="outline" className="w-full text-xs h-8 mt-auto pointer-events-none">View Batches</Button>
            </div>
          ))}
          {courses.length === 0 && (
            <div className="col-span-full py-12 text-center border border-dashed border-border rounded-xl">
              <p className="text-muted-foreground font-sans">You are not managing any courses yet.</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-card border border-border rounded-[1rem] p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="font-sans font-semibold text-xl">Global Course Roster</h2>
          <div className="w-full sm:w-[300px]">
            <EntityCombobox
              endpoint="/api/v1/admin/courses"
              label="Course"
              displayKey="name"
              valueKey="id"
              value={selectedCourseId}
              onSelect={(id) => setSelectedCourseId(id)}
            />
          </div>
        </div>

        <StudentRosterTable 
          fetchUrl="/api/v1/admin/students"
          sessionFetchUrl="/api/v1/admin/students"
        />
      </div>
    </div>
  );
}
