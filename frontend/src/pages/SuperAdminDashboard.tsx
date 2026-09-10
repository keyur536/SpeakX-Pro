import { useState, useEffect } from "react";
import { StudentRosterTable } from "@/components/shared/StudentRosterTable";
import { CreateAdminDialog } from "@/components/shared/CreateAdminDialog";
import { CreateFacultyDialog } from "@/components/shared/CreateFacultyDialog";
import { ViewFacultyDialog } from "@/components/shared/ViewFacultyDialog";
import { StatCard } from "@/components/shared/StatCard";
import { Users } from "lucide-react";
import axios from "axios";

export default function SuperAdminDashboard() {
  const [facultyDialogOpen, setFacultyDialogOpen] = useState(false);
  const [stats, setStats] = useState({
    total_students: 0,
    total_faculty: 0,
    total_sessions: 0,
    avg_overall_score: 0,
    sessions_this_week: 0
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const statsRes = await axios.get("http://localhost:8000/api/v1/super-admin/overview", { withCredentials: true });
        setStats(statsRes.data);
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      }
    };
    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-10 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight text-foreground mb-2">Global Overview</h1>
          <p className="font-sans text-muted-foreground">Platform-wide statistics and management.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <CreateAdminDialog />
          <CreateFacultyDialog />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard
          title="Total Students"
          value={stats.total_students}
          icon={<Users className="w-5 h-5" />}
        />
        <StatCard
          title="Total Faculty"
          value={stats.total_faculty}
          icon={<Users className="w-5 h-5" />}
          onClick={() => setFacultyDialogOpen(true)}
        />
      </div>

      <ViewFacultyDialog open={facultyDialogOpen} onOpenChange={setFacultyDialogOpen} />

      <div className="bg-card border border-border rounded-[1rem] p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="font-sans font-semibold text-xl">All Students (Paginated)</h2>
        </div>

        <StudentRosterTable 
          fetchUrl="/api/v1/super-admin/students?limit=20"
          sessionFetchUrl="/api/v1/super-admin/students"
        />
      </div>
    </div>
  );
}
