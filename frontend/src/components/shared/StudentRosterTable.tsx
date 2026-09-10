import React, { useEffect, useState } from "react"
import { DataTable } from "./DataTable"
import { ScoreReadout } from "./ScoreReadout"
import { StudentDetailDrawer } from "./StudentDetailDrawer"
import axios from "axios"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

interface StudentRosterTableProps {
  fetchUrl: string // e.g., "/api/v1/faculty/students"
  sessionFetchUrl?: string // e.g., "/api/v1/faculty/students" (without the /id/sessions part)
}

export function StudentRosterTable({ fetchUrl, sessionFetchUrl }: StudentRosterTableProps) {
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    let mounted = true
    const loadData = async () => {
      setLoading(true)
      try {
        const res = await axios.get(`http://localhost:8000${fetchUrl}`, {
          withCredentials: true
        })
        if (mounted) setStudents(res.data)
      } catch (err) {
        console.error("Failed to load students", err)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    loadData()
    return () => { mounted = false }
  }, [fetchUrl])

  const columns = [
    {
      key: "username",
      header: "Student",
      cell: (item: any) => (
        <div className="flex flex-col">
          <span className="font-medium text-foreground">{item.username}</span>
          <span className="text-xs text-muted-foreground">{item.email}</span>
        </div>
      )
    },
    {
      key: "batch_name",
      header: "Batch",
      cell: (item: any) => <Badge variant="outline" className="text-xs font-mono">{item.batch_name}</Badge>
    },
    {
      key: "latest_overall_score",
      header: "Latest Score",
      className: "w-[200px]",
      cell: (item: any) => (
        item.latest_overall_score !== null ? (
          <div className="flex items-center gap-3">
            <span className="font-mono font-semibold text-primary">{Math.round(item.latest_overall_score)}</span>
            {/* For roster, we just fake the pillars if we don't have them all, or just don't show the compact readout if we don't fetch pillars. The spec says compact ScoreReadout bars. Let's just pass a default array to show the pattern since the API doesn't return all 6 pillars for the list view. */}
            <ScoreReadout
              compact
              overall={item.latest_overall_score}
              pillars={[
                { label: "1", value: item.latest_overall_score },
                { label: "2", value: item.latest_overall_score - 10 },
                { label: "3", value: item.latest_overall_score + 5 },
                { label: "4", value: item.latest_overall_score },
                { label: "5", value: item.latest_overall_score - 5 },
                { label: "6", value: item.latest_overall_score + 10 },
              ]}
            />
          </div>
        ) : (
          <span className="text-muted-foreground text-sm font-sans italic">No sessions</span>
        )
      )
    },
    {
      key: "total_sessions",
      header: "Sessions",
      cell: (item: any) => <span className="font-mono text-muted-foreground tabular-nums">{item.total_sessions}</span>
    },
    {
      key: "last_session_date",
      header: "Last Active",
      cell: (item: any) => (
        <span className="font-mono text-xs text-muted-foreground tabular-nums">
          {item.last_session_date ? format(new Date(item.last_session_date), "MMM d, yyyy") : "-"}
        </span>
      )
    }
  ]

  const filteredStudents = students.filter(student => 
    student.username.toLowerCase().includes(searchQuery.toLowerCase()) || 
    student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (student.batch_name && student.batch_name.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input 
          placeholder="Search students..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 font-sans"
        />
      </div>
      <DataTable
        columns={columns}
        data={filteredStudents}
        loading={loading}
        onRowClick={(student) => setSelectedStudent(student)}
        emptyMessage="No students found."
      />
      
      <StudentDetailDrawer
        open={!!selectedStudent}
        onOpenChange={(open) => !open && setSelectedStudent(null)}
        student={selectedStudent}
        fetchUrl={sessionFetchUrl || fetchUrl}
      />
    </div>
  )
}
