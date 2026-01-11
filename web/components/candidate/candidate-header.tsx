import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScoreBadge } from "./score-badge"
import { Mail, Phone, Calendar, ArrowLeft, CheckCircle, XCircle } from "lucide-react"
import Link from "next/link"
import type { Candidate } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

interface CandidateHeaderProps {
  candidate: Candidate
}

export function CandidateHeader({ candidate }: CandidateHeaderProps) {
  const statusConfig = {
    pending: { color: "#F59E0B", label: "Pending Review" },
    reviewed: { color: "#3B82F6", label: "Reviewed" },
    shortlisted: { color: "#10B981", label: "Shortlisted" },
    rejected: { color: "#EF4444", label: "Rejected" },
  }

  const status = statusConfig[candidate.status]

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: Back + Avatar + Info */}
        <div className="flex items-start gap-4">
          <Link href="/candidates">
            <Button variant="ghost" size="icon" className="mt-1">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-[#3B82F6]/10 text-[#3B82F6] text-xl font-semibold">
              {candidate.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-foreground">{candidate.name}</h1>
              <Badge
                variant="outline"
                className={cn("font-medium")}
                style={{
                  backgroundColor: `${status.color}15`,
                  color: status.color,
                  borderColor: `${status.color}30`,
                }}
              >
                {status.label}
              </Badge>
            </div>
            <p className="mt-1 text-lg text-muted-foreground">{candidate.role}</p>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Mail className="h-4 w-4" />
                {candidate.email}
              </span>
              <span className="flex items-center gap-1.5">
                <Phone className="h-4 w-4" />
                {candidate.phone}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                Applied {new Date(candidate.appliedDate).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Score + Actions */}
        <div className="flex items-center gap-6 lg:flex-col lg:items-end">
          <ScoreBadge score={candidate.overallScore} size="md" />
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="gap-2 text-[#EF4444] border-[#EF4444]/30 hover:bg-[#EF4444]/10 bg-transparent"
            >
              <XCircle className="h-4 w-4" />
              Reject
            </Button>
            <Button className="gap-2 bg-[#10B981] hover:bg-[#059669] text-white">
              <CheckCircle className="h-4 w-4" />
              Shortlist
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
