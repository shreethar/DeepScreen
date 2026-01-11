"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, CheckCircle, AlertTriangle, XCircle, Sparkles } from "lucide-react"
import type { Candidate } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

interface IntegrityCheckProps {
  candidate: Candidate
}

export function IntegrityCheck({ candidate }: IntegrityCheckProps) {
  const { integrityCheck } = candidate
  const isHighGenAI = integrityCheck.genAIProbability >= 80

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* GenAI Probability Meter */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-foreground">
            <Sparkles className={cn("h-5 w-5", isHighGenAI ? "text-[#8B5CF6]" : "text-[#3B82F6]")} />
            GenAI Detection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center py-6">
            {/* Semi-circle gauge */}
            <div className="relative h-32 w-64">
              <svg viewBox="0 0 200 100" className="w-full h-full">
                {/* Background arc */}
                <path
                  d="M 10 100 A 90 90 0 0 1 190 100"
                  fill="none"
                  stroke="#E2E8F0"
                  strokeWidth="16"
                  strokeLinecap="round"
                />
                {/* Filled arc */}
                <path
                  d="M 10 100 A 90 90 0 0 1 190 100"
                  fill="none"
                  stroke={isHighGenAI ? "#8B5CF6" : integrityCheck.genAIProbability >= 50 ? "#F59E0B" : "#10B981"}
                  strokeWidth="16"
                  strokeLinecap="round"
                  strokeDasharray={`${integrityCheck.genAIProbability * 2.83} 283`}
                />
              </svg>
              <div className="absolute inset-0 flex items-end justify-center pb-2">
                <div className="text-center">
                  <span
                    className={cn(
                      "text-4xl font-bold",
                      isHighGenAI
                        ? "text-[#8B5CF6]"
                        : integrityCheck.genAIProbability >= 50
                          ? "text-[#F59E0B]"
                          : "text-[#10B981]",
                    )}
                  >
                    {integrityCheck.genAIProbability}%
                  </span>
                </div>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground text-center">
              Likelihood that resume content is AI-generated
            </p>
            {isHighGenAI && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-[#8B5CF6]/10 px-4 py-2">
                <AlertTriangle className="h-4 w-4 text-[#8B5CF6]" />
                <span className="text-sm font-medium text-[#8B5CF6]">
                  High probability of AI-generated content detected
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Portfolio Validation */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-foreground">
            <Shield className="h-5 w-5 text-[#3B82F6]" />
            Portfolio Validation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {integrityCheck.portfolioValidation.map((item, index) => {
              const statusConfig = {
                verified: { icon: CheckCircle, color: "#10B981", label: "Verified" },
                warning: { icon: AlertTriangle, color: "#F59E0B", label: "Warning" },
                failed: { icon: XCircle, color: "#EF4444", label: "Failed" },
              }
              const config = statusConfig[item.status]
              const StatusIcon = config.icon

              return (
                <div key={index} className="flex items-start gap-3 rounded-lg border border-border p-3">
                  <div
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${config.color}15` }}
                  >
                    <StatusIcon className="h-4 w-4" style={{ color: config.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">{item.item}</p>
                      <span className="text-xs font-medium" style={{ color: config.color }}>
                        {config.label}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{item.detail}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
