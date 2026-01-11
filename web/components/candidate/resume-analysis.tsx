import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { FileText, Check, X, GraduationCap, Briefcase, Target } from "lucide-react"
import type { Candidate } from "@/lib/mock-data"

interface ResumeAnalysisProps {
  candidate: Candidate
}

export function ResumeAnalysis({ candidate }: ResumeAnalysisProps) {
  const { resumeAnalysis } = candidate

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* PDF Viewer Placeholder */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-foreground">
            <FileText className="h-5 w-5 text-[#3B82F6]" />
            Resume Document
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[400px] items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30">
            <div className="text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">PDF Viewer</p>
              <p className="text-xs text-muted-foreground">Resume preview will appear here</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Panel */}
      <div className="space-y-4">
        {/* Skills Analysis */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-foreground">
              <Target className="h-5 w-5 text-[#3B82F6]" />
              Skills Gap Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">Found Skills</p>
              <div className="flex flex-wrap gap-2">
                {resumeAnalysis.skillsFound.map((skill) => (
                  <Badge
                    key={skill}
                    variant="outline"
                    className="gap-1 bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30"
                  >
                    <Check className="h-3 w-3" />
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">Missing Required Skills</p>
              <div className="flex flex-wrap gap-2">
                {resumeAnalysis.skillsMissing.map((skill) => (
                  <Badge
                    key={skill}
                    variant="outline"
                    className="gap-1 bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30"
                  >
                    <X className="h-3 w-3" />
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Experience & Education */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-foreground">
              <Briefcase className="h-5 w-5 text-[#3B82F6]" />
              Experience & Education
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-foreground">Years of Experience</span>
              </div>
              <span className="text-lg font-semibold text-foreground">{resumeAnalysis.experienceYears} years</span>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">Education Match</span>
                </div>
                <span className="text-sm font-medium text-[#10B981]">{resumeAnalysis.educationMatch}%</span>
              </div>
              <Progress value={resumeAnalysis.educationMatch} className="h-2" />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">Keyword Match</span>
                </div>
                <span className="text-sm font-medium text-[#3B82F6]">{resumeAnalysis.keywordMatch}%</span>
              </div>
              <Progress value={resumeAnalysis.keywordMatch} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
