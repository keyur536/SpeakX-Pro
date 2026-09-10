import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface StatCardProps {
  title: string
  value: string | number
  icon?: React.ReactNode
  trend?: string
  accentColor?: "amber" | "teal"
  onClick?: () => void
}

export function StatCard({ title, value, icon, trend, accentColor = "teal", onClick }: StatCardProps) {
  return (
    <Card 
      className={cn("overflow-hidden border-border bg-card", onClick && "cursor-pointer hover:border-primary transition-colors")}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <p className="font-sans text-sm font-medium text-muted-foreground">{title}</p>
          {icon && <div className="text-muted-foreground">{icon}</div>}
        </div>
        <div className="mt-4 flex items-baseline gap-2">
          <h2 className="font-mono text-4xl font-bold text-foreground">{value}</h2>
          {trend && (
            <span
              className={cn(
                "font-mono text-xs",
                accentColor === "amber" ? "text-primary" : "text-accent"
              )}
            >
              {trend}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
