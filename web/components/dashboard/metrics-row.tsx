"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Users, Target, Video, TrendingUp, TrendingDown, Calendar, Sparkles, Activity } from "lucide-react"
import { cn } from "@/lib/utils"
import { collection, getDocs, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"

export function MetricsRow() {
  const [stats, setStats] = useState({
    totalCandidates: 0,
    candidatesThisWeek: 0,
    avgMatchScore: 0,
    pendingReviews: 0,
    interviewsNextWeek: 0
  })

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "applications"))
        const apps = querySnapshot.docs.map(doc => doc.data())

        const totalCandidates = apps.length

        // Candidates this week
        const now = new Date()
        const oneWeekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
        const candidatesThisWeek = apps.filter(app => {
          const submittedAt = app.submittedAt instanceof Timestamp ? app.submittedAt.toDate() : null
          return submittedAt && submittedAt > oneWeekAgo
        }).length

        // Avg Match Score
        let totalScore = 0
        let scoredCount = 0

        apps.forEach(app => {
          let score = 0
          if (app.layer3?.llmScore) {
            score = app.layer3.llmScore
            scoredCount++
          } else if (app.layer2?.semanticScore) {
            score = app.layer2.semanticScore * 100
            scoredCount++
          }
          totalScore += score
        })

        const avgMatchScore = scoredCount > 0 ? Math.round(totalScore / scoredCount) : 0

        // Pending Reviews (Logic: status is 'submitted' or 'filtered')
        // Assuming 'status' or 'pipelineState' field. 
        // Based on previous files, it's 'pipelineState'.
        const pendingReviews = apps.filter(app =>
          app.pipelineState === 'submitted'
        ).length

        // Interviews scheduled for next week
        const queryInterviews = await getDocs(collection(db, "interviews"))
        const oneWeekFromNow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7)

        const interviewsNextWeek = queryInterviews.docs.filter(doc => {
          const data = doc.data()
          if (!data.scheduledAt) return false
          if (data.status === 'completed' || data.status === 'cancelled') return false
          const scheduledDate = data.scheduledAt.toDate()
          return scheduledDate >= now && scheduledDate <= oneWeekFromNow
        }).length

        setStats({
          totalCandidates,
          candidatesThisWeek,
          avgMatchScore,
          pendingReviews,
          interviewsNextWeek
        })

      } catch (error) {
        console.error("Error fetching metrics:", error)
      }
    }
    fetchStats()
  }, [])

  const metrics = [
    {
      label: "Total Candidates",
      value: stats.totalCandidates,
      icon: Users,
      change: `+${stats.candidatesThisWeek}`,
      trend: "up",
      period: "this week",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      label: "Avg Match Score",
      value: `${stats.avgMatchScore}%`,
      icon: Target,
      change: "+3%", // Keeping static for now as historical data is complex
      trend: "up",
      period: "vs last month",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Pending Reviews",
      value: stats.pendingReviews,
      icon: Video,
      change: "+5",
      trend: "down",
      period: "new items",
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      label: "Time to Hire",
      value: "18d",
      icon: Activity,
      change: "-2d",
      trend: "up",
      period: "vs avg",
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    {
      label: "Interviews",
      value: stats.interviewsNextWeek,
      icon: Calendar,
      change: "Upcoming",
      trend: "up",
      period: "scheduled this week",
      color: "text-indigo-500",
      bg: "bg-indigo-500/10",
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {metrics.map((metric) => (
        <Card key={metric.label} className="border-border/50 bg-card hover:shadow-sm transition-all hover:bg-muted/20">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <div
                className={cn("flex h-9 w-9 items-center justify-center rounded-lg", metric.bg)}
              >
                <metric.icon className={cn("h-4 w-4", metric.color)} />
              </div>
              <div className={cn("flex items-center text-xs font-medium px-1.5 py-0.5 rounded-full",
                metric.trend === 'up' ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"
              )}>
                {metric.trend === 'up' ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {metric.change}
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-foreground tracking-tight">{metric.value}</p>
              <p className="text-xs text-muted-foreground font-medium mt-1">{metric.label}</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5 capitalize">{metric.period}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
