"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Trophy, ChevronRight } from "lucide-react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"

interface Candidate {
  id: string
  name: string
  role: string
  overallScore: number
}

function getScoreColor(score: number) {
  if (score >= 85) return { bg: "bg-[#10B981]/10", text: "text-[#10B981]", border: "border-[#10B981]/30" }
  if (score >= 70) return { bg: "bg-[#F59E0B]/10", text: "text-[#F59E0B]", border: "border-[#F59E0B]/30" }
  return { bg: "bg-[#EF4444]/10", text: "text-[#EF4444]", border: "border-[#EF4444]/30" }
}

export function Leaderboard() {
  const [candidates, setCandidates] = useState<Candidate[]>([])

  useEffect(() => {
    const fetchTopCandidates = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "applications"))
        const apps = querySnapshot.docs.map(doc => {
          const data = doc.data()
          // Calculate overall score (LLM > Semantic > 0)
          let score = 0
          if (data.layer3?.llmScore) {
            score = data.layer3.llmScore
          } else if (data.layer2?.semanticScore) {
            score = data.layer2.semanticScore * 100
          }

          return {
            id: doc.id,
            name: data.applicantName || "Unknown Applicant",
            role: data.layer1?.extractedData?.role || "Applicant", // Fallback role
            overallScore: Math.round(score)
          }
        })

        // Sort by score desc, take top 5
        const top5 = apps.sort((a, b) => b.overallScore - a.overallScore).slice(0, 5)
        setCandidates(top5)

      } catch (e) {
        console.error("Error fetching top candidates:", e)
      }
    }
    fetchTopCandidates()
  }, [])

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
          {candidates.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-sm">No scored candidates yet.</div>
          ) : (
            candidates.map((candidate, index) => {
              const scoreColors = getScoreColor(candidate.overallScore)
              return (
                <Link
                  key={candidate.id}
                  // Note: This link assumes /hr/candidates/ID page exists locally, 
                  // or user might just want to go to the list and filter. 
                  // Based on existing code, /candidates/[id] might not be the dashboard route. 
                  // Safest is to link to the list with query param or just list.
                  // But original code linked to `/candidates/${candidate.id}`, let's keep it consistent
                  // or link to the modal on the main candidates page if possible.
                  // For now, linking to main page is safer if detail page doesn't exist.
                  href={`/hr/candidates?id=${candidate.id}`}
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
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}
