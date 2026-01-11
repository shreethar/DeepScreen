"use client"

import { MetricsRow } from "@/components/dashboard/metrics-row"
import { Leaderboard } from "@/components/dashboard/leaderboard"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { ApplicationTrends } from "@/components/dashboard/application-trends"
import { RecruitmentFunnel } from "@/components/dashboard/recruitment-funnel"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

export default function HRDashboardPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-foreground">Analytics Overview</h1>
                    <p className="text-muted-foreground">Real-time insights into your recruitment pipeline</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-2">
                        <Download className="h-4 w-4" />
                        Export Report
                    </Button>
                </div>
            </div>

            <MetricsRow />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
                <ApplicationTrends />
                <RecruitmentFunnel />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Leaderboard />
                <RecentActivity />
            </div>
        </div>
    )
}
