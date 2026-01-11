import { Card, CardContent } from "@/components/ui/card"
import { Users, Target, Video, TrendingUp, TrendingDown, Calendar, Sparkles, Activity } from "lucide-react"
import { dashboardMetrics } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

const metrics = [
  {
    label: "Total Candidates",
    value: dashboardMetrics.totalCandidates,
    icon: Users,
    change: "+12",
    trend: "up",
    period: "this week",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    label: "Avg Match Score",
    value: `${dashboardMetrics.averageMatchScore}%`,
    icon: Target,
    change: "+3%",
    trend: "up",
    period: "vs last month",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    label: "Pending Reviews",
    value: dashboardMetrics.pendingVideoReviews,
    icon: Video,
    change: "+5",
    trend: "down", // Negative trend because pending is backlog
    period: "new items",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    label: "Time to Hire",
    value: "18d",
    icon: Activity,
    change: "-2d",
    trend: "up", // Good trend
    period: "vs avg",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
  {
    label: "Interviews",
    value: dashboardMetrics.interviewsScheduled,
    icon: Calendar,
    change: "+4",
    trend: "up",
    period: "scheduled",
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
  },
  {
    label: "New Apps",
    value: dashboardMetrics.newApplicationsToday,
    icon: Sparkles,
    change: "+7",
    trend: "up",
    period: "today",
    color: "text-rose-500",
    bg: "bg-rose-500/10",
  },
]

export function MetricsRow() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
