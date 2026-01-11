import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Video, CheckCircle, XCircle, Clock } from "lucide-react"

const activities = [
  {
    icon: FileText,
    iconColor: "#3B82F6",
    title: "New resume uploaded",
    description: "Alex Chen - Senior Frontend Engineer",
    time: "2 minutes ago",
  },
  {
    icon: Video,
    iconColor: "#8B5CF6",
    title: "Video analysis complete",
    description: "Sarah Johnson - Product Designer",
    time: "15 minutes ago",
  },
  {
    icon: CheckCircle,
    iconColor: "#10B981",
    title: "Candidate shortlisted",
    description: "Emily Rodriguez - Data Scientist",
    time: "1 hour ago",
  },
  {
    icon: XCircle,
    iconColor: "#EF4444",
    title: "Application rejected",
    description: "David Park - Senior Frontend Engineer",
    time: "2 hours ago",
  },
  {
    icon: Clock,
    iconColor: "#F59E0B",
    title: "Interview scheduled",
    description: "Marcus Williams - Backend Engineer",
    time: "3 hours ago",
  },
]

export function RecentActivity() {
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity, index) => (
            <div key={index} className="flex gap-3">
              <div
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: `${activity.iconColor}15` }}
              >
                <activity.icon className="h-4 w-4" style={{ color: activity.iconColor }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{activity.title}</p>
                <p className="text-sm text-muted-foreground truncate">{activity.description}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
