import React, { useEffect, useState } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ScoreReadout } from "./ScoreReadout"
import { Skeleton } from "@/components/ui/skeleton"
import axios from "axios"
import { format } from "date-fns"

interface StudentDetailDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  student: any | null
  fetchUrl: string // Base URL to fetch sessions, e.g., "/api/v1/faculty/students"
}

export function StudentDetailDrawer({ open, onOpenChange, student, fetchUrl }: StudentDetailDrawerProps) {
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && student) {
      let mounted = true
      const loadSessions = async () => {
        setLoading(true)
        try {
          const res = await axios.get(`http://localhost:8000${fetchUrl}/${student.id}/sessions`, {
            withCredentials: true
          })
          if (mounted) setSessions(res.data)
        } catch (error) {
          console.error("Error fetching sessions:", error)
        } finally {
          if (mounted) setLoading(false)
        }
      }
      loadSessions()
      return () => { mounted = false }
    }
  }, [open, student, fetchUrl])

  if (!student) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl bg-background border-border overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="font-display text-2xl tracking-tight text-foreground">
            {student.username}
          </SheetTitle>
          <SheetDescription className="font-sans text-muted-foreground">
            {student.email} · Batch: {student.batch_name}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-8">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-muted-foreground font-sans">No sessions recorded yet.</p>
          ) : (
            sessions.map((session, i) => (
              <div key={session.id} className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-sans font-semibold text-lg text-foreground">
                    Session {sessions.length - i}
                  </h3>
                  <span className="font-mono text-sm text-muted-foreground">
                    {format(new Date(session.session_date), "MMM d, yyyy")}
                  </span>
                </div>
                
                <div className="mb-8">
                  <ScoreReadout
                    overall={session.overall_score}
                    pillars={[
                      { label: "Confidence", value: session.confidence_score },
                      { label: "Fluency", value: session.fluency_score },
                      { label: "English", value: session.english_proficiency_score },
                      { label: "Impact", value: session.communication_impact_score },
                      { label: "Engagement", value: session.vocal_engagement_score },
                      { label: "Presence", value: session.physical_presence_score },
                    ]}
                  />
                </div>

                <div className="space-y-3">
                  <h4 className="font-display italic text-primary text-xl">Coach's Feedback</h4>
                  <div className="font-sans text-foreground leading-relaxed whitespace-pre-wrap">
                    {session.llm_report || "No feedback available."}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
