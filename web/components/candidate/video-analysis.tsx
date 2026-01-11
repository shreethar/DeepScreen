"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Play, MessageSquare } from "lucide-react"
import type { Candidate } from "@/lib/mock-data"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"

interface VideoAnalysisProps {
  candidate: Candidate
}

export function VideoAnalysis({ candidate }: VideoAnalysisProps) {
  const { videoAnalysis } = candidate

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Video Player & Chart Column */}
      <div className="space-y-4">
        {/* Video Player Placeholder */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-foreground">
              <Play className="h-5 w-5 text-[#8B5CF6]" />
              Video Interview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative aspect-video rounded-lg bg-[#0F172A] flex items-center justify-center overflow-hidden">
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/10 backdrop-blur">
                  <Play className="h-8 w-8 text-white ml-1" />
                </div>
                <p className="mt-3 text-sm text-white/70">Duration: {videoAnalysis.duration}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sentiment Chart */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-foreground">Confidence Level Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={videoAnalysis.sentimentData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="time" tick={{ fill: "#64748B", fontSize: 12 }} axisLine={{ stroke: "#E2E8F0" }} />
                  <YAxis domain={[0, 100]} tick={{ fill: "#64748B", fontSize: 12 }} axisLine={{ stroke: "#E2E8F0" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #E2E8F0",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    }}
                    labelStyle={{ color: "#1E293B", fontWeight: 600 }}
                  />
                  <ReferenceLine y={70} stroke="#F59E0B" strokeDasharray="5 5" />
                  <Line
                    type="monotone"
                    dataKey="confidence"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={{ fill: "#3B82F6", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: "#3B82F6" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Overall Confidence:{" "}
                <span className="font-semibold text-[#3B82F6]">{videoAnalysis.overallConfidence}%</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="h-0.5 w-4 bg-[#F59E0B]"></span>
                70% threshold
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transcript */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-foreground">
            <MessageSquare className="h-5 w-5 text-[#3B82F6]" />
            Transcript
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[500px] overflow-y-auto space-y-4 pr-2">
            {videoAnalysis.transcript.map((entry, index) => (
              <div key={index} className="group">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 rounded bg-[#3B82F6]/10 px-2 py-0.5 text-xs font-mono text-[#3B82F6]">
                    {entry.timestamp}
                  </span>
                  <p className="text-sm text-foreground leading-relaxed">{entry.text}</p>
                </div>
                {index < videoAnalysis.transcript.length - 1 && <div className="mt-3 border-b border-border" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
