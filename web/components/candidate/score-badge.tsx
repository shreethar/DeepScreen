import { cn } from "@/lib/utils"

interface ScoreBadgeProps {
  score: number
  size?: "sm" | "md" | "lg"
  showLabel?: boolean
}

export function ScoreBadge({ score, size = "md", showLabel = true }: ScoreBadgeProps) {
  const getScoreConfig = (score: number) => {
    if (score >= 85) return { color: "#10B981", label: "Excellent" }
    if (score >= 70) return { color: "#F59E0B", label: "Good" }
    if (score >= 50) return { color: "#F59E0B", label: "Average" }
    return { color: "#EF4444", label: "Low" }
  }

  const config = getScoreConfig(score)

  const sizeClasses = {
    sm: "h-12 w-12 text-lg",
    md: "h-20 w-20 text-2xl",
    lg: "h-32 w-32 text-4xl",
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={cn("flex items-center justify-center rounded-full font-bold text-white", sizeClasses[size])}
        style={{ backgroundColor: config.color }}
      >
        {score}%
      </div>
      {showLabel && (
        <span className="text-sm font-medium" style={{ color: config.color }}>
          {config.label} Match
        </span>
      )}
    </div>
  )
}
