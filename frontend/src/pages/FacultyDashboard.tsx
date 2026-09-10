import { useState, useEffect } from "react";
import { StudentRosterTable } from "@/components/shared/StudentRosterTable";
import { EntityCombobox } from "@/components/shared/EntityCombobox";
import { StatCard } from "@/components/shared/StatCard";
import { Users, BookOpen } from "lucide-react";
import axios from "axios";

export default function FacultyDashboard() {
  const [selectedBatchId, setSelectedBatchId] = useState<number | undefined>();
  const [stats, setStats] = useState({ batches: 0, totalStudents: 0 });

  useEffect(() => {
    // Quick fetch to get stats (in a real app, maybe a dedicated stats endpoint)
    const fetchStats = async () => {
      try {
        const [batchesRes, studentsRes] = await Promise.all([
          axios.get("http://localhost:8000/api/v1/faculty/batches", { withCredentials: true }),
          axios.get("http://localhost:8000/api/v1/faculty/students", { withCredentials: true })
        ]);
        setStats({
          batches: batchesRes.data.length,
          totalStudents: studentsRes.data.length
        });
      } catch (err) {
        console.error("Failed to load stats", err);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-10 max-w-7xl mx-auto">
      <div>
        <h1 className="font-display text-4xl font-bold tracking-tight text-foreground mb-2">Batch Overview</h1>
        <p className="font-sans text-muted-foreground">Monitor student performance and session history.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard
          title="Assigned Batches"
          value={stats.batches}
          icon={<BookOpen className="w-5 h-5" />}
          accentColor="amber"
        />
        <StatCard
          title="Total Students"
          value={stats.totalStudents}
          icon={<Users className="w-5 h-5" />}
        />
      </div>

      <div className="bg-card border border-border rounded-[1rem] p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="font-sans font-semibold text-xl">Student Roster</h2>
          {/* 
            Since our backend route `/api/v1/faculty/students` doesn't currently accept a ?batch_id filter,
            we will just show all students. In a full implementation, we'd pass ?batch_id=selectedBatchId 
            to the fetchUrl below. 
          */}
          <div className="w-full sm:w-[300px]">
             {/* Just visually showing the combobox as requested, even if filter isn't hooked to backend yet */}
            <EntityCombobox
              endpoint="/api/v1/faculty/batches"
              label="Batch"
              displayKey="code"
              valueKey="id"
              value={selectedBatchId}
              onSelect={(id) => setSelectedBatchId(id)}
            />
          </div>
        </div>

        <StudentRosterTable 
          fetchUrl="/api/v1/faculty/students"
          sessionFetchUrl="/api/v1/faculty/students"
        />
      </div>
    </div>
  );
}
