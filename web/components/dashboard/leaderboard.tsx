import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { topCandidates } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import { Trophy, ChevronRight } from "lucide-react"

function getScoreColor(score: number) {
  if (score >= 85) return { bg: "bg-[#10B981]/10", text: "text-[#10B981]", border: "border-[#10B981]/30" }
  if (score >= 70) return { bg: "bg-[#F59E0B]/10", text: "text-[#F59E0B]", border: "border-[#F59E0B]/30" }
  return { bg: "bg-[#EF4444]/10", text: "text-[#EF4444]", border: "border-[#EF4444]/30" }
}

export function Leaderboard() {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-[#F59E0B]" />
          <CardTitle className="text-lg font-semibold text-foreground">Top 5 Candidates</CardTitle>
        </div>
        <Link href="/hr/candidates" className="flex items-center gap-1 text-sm text-[#3B82F6] hover:underline">
          View all
          <ChevronRight className="h-4 w-4" />
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {topCandidates.map((candidate, index) => {
            const scoreColors = getScoreColor(candidate.overallScore)
            return (
              <Link
                key={candidate.id}
                href={`/candidates/${candidate.id}`}
                className="flex items-center gap-4 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
                  {index + 1}
                </div>
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-[#3B82F6]/10 text-[#3B82F6] text-sm">
                    {candidate.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{candidate.name}</p>
                  <p className="text-sm text-muted-foreground truncate">{candidate.role}</p>
                </div>
                <Badge
                  variant="outline"
                  className={cn("font-semibold", scoreColors.bg, scoreColors.text, scoreColors.border)}
                >
                  {candidate.overallScore}% Match
                </Badge>
              </Link>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
