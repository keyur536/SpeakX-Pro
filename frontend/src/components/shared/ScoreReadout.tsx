import React from "react"
import { cn } from "@/lib/utils"

interface ScoreReadoutProps {
  overall: number
  pillars: { label: string; value: number }[]
  highlight?: string
  compact?: boolean
}

export function ScoreReadout({ overall, pillars, highlight, compact = false }: ScoreReadoutProps) {
  if (compact) {
    return (
      <div className="flex items-end gap-1 h-6">
        {pillars.map((p) => {
          const isHighlight = p.label.toLowerCase() === highlight?.toLowerCase()
          return (
            <div
              key={p.label}
              title={`${p.label}: ${p.value}`}
              className={cn(
                "w-1.5 rounded-t-sm",
                isHighlight ? "bg-primary" : "bg-accent"
              )}
              style={{ height: `${Math.max(10, p.value)}%` }}
            />
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-8">
      {/* Overall Score Circle */}
      <div className="relative flex h-32 w-32 items-center justify-center rounded-full border-[6px] border-primary/20">
        {/* Fake progress ring for visual */}
        <svg className="absolute inset-0 h-full w-full -rotate-90">
          <circle
            cx="50%"
            cy="50%"
            r="46%"
            className="fill-none stroke-primary"
            strokeWidth="6"
            strokeDasharray="100 100"
            strokeDashoffset={100 - overall}
            pathLength="100"
            strokeLinecap="round"
          />
        </svg>
        <div className="flex flex-col items-center">
          <span className="font-mono text-4xl font-bold text-foreground">{overall}</span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-sans">Overall</span>
        </div>
      </div>

      {/* Pillars Equalizer */}
      <div className="flex h-24 items-end gap-6">
        {pillars.map((p) => {
          const isHighlight = p.label.toLowerCase() === highlight?.toLowerCase()
          return (
            <div key={p.label} className="flex flex-col items-center gap-3">
              <div className="flex h-full w-4 flex-col justify-end">
                <div
                  className={cn(
                    "w-full rounded-t-sm transition-all duration-500",
                    isHighlight ? "bg-primary" : "bg-accent"
                  )}
                  style={{ height: `${Math.max(10, p.value)}%` }}
                />
              </div>
              <div className="flex flex-col items-center">
                <span className="font-mono text-sm font-medium">{p.value}</span>
                <span className="max-w-[60px] text-center font-sans text-[10px] leading-tight text-muted-foreground">
                  {p.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
