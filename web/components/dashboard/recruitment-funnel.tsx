"use client"

import { useEffect, useState } from "react"
import { Bar, BarChart, XAxis, YAxis, LabelList, CartesianGrid } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"

const chartConfig = {
    candidates: {
        label: "Candidates",
        color: "hsl(var(--chart-1))",
    },
} satisfies ChartConfig

export function RecruitmentFunnel() {
    const [funnelData, setFunnelData] = useState([
        { stage: "Applied", candidates: 0, fill: "#3B82F6" },
        { stage: "Screening", candidates: 0, fill: "#60A5FA" },
        { stage: "Interview", candidates: 0, fill: "#818CF8" },
        { stage: "Offer", candidates: 0, fill: "#A78BFA" },
        { stage: "Hired", candidates: 0, fill: "#10B981" },
    ])

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [applicationsSnapshot, interviewsSnapshot] = await Promise.all([
                    getDocs(collection(db, "applications")),
                    getDocs(collection(db, "interviews"))
                ])

                const interviewedCandidateIds = new Set(
                    interviewsSnapshot.docs.map(doc => doc.data().candidateId)
                )

                const applied = applicationsSnapshot.size
                let screening = 0
                let interviewed = 0
                let offer = 0
                let hired = 0

                applicationsSnapshot.forEach((doc) => {
                    const data = doc.data()
                    const status = data.pipelineState as string

                    const isHired = status === 'hired'
                    const hasOffer = isHired || ['offer_sent', 'offer_declined'].includes(status)

                    // Interviewed: Has offer OR is in interview statuses OR has an interview document
                    const isInterviewed = hasOffer ||
                        ['interview_completed', 'interview_scheduled', 'shortlisted'].includes(status) ||
                        interviewedCandidateIds.has(doc.id)

                    // Screened: Is Interviewed OR is in screened status
                    // We exclude 'pending' and 'rejected' unless they made it further
                    const isScreened = isInterviewed || status === 'screened'

                    if (isScreened) screening++
                    if (isInterviewed) interviewed++
                    if (hasOffer) offer++
                    if (isHired) hired++
                })

                setFunnelData([
                    { stage: "Applied", candidates: applied, fill: "#3B82F6" },
                    { stage: "Screening", candidates: screening, fill: "#60A5FA" },
                    { stage: "Interview", candidates: interviewed, fill: "#818CF8" },
                    { stage: "Offer", candidates: offer, fill: "#A78BFA" },
                    { stage: "Hired", candidates: hired, fill: "#10B981" },
                ])
            } catch (error) {
                console.error("Error fetching funnel data:", error)
            }
        }

        fetchData()
    }, [])

    return (
        <Card className="col-span-1 md:col-span-2 lg:col-span-3 border-border/50">
            <CardHeader>
                <CardTitle>Recruitment Funnel</CardTitle>
                <CardDescription>Conversion rates per stage</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                    <BarChart
                        data={funnelData}
                        layout="vertical"
                        margin={{
                            top: 0,
                            right: 0,
                            left: 0,
                            bottom: 0,
                        }}
                        barSize={32}
                    >
                        <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#e5e5e5" />
                        <YAxis
                            dataKey="stage"
                            type="category"
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}
                            className="text-sm font-medium"
                            width={70}
                        />
                        <XAxis type="number" hide />
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent indicator="line" />}
                        />
                        <Bar
                            dataKey="candidates"
                            layout="vertical"
                            radius={[0, 4, 4, 0]}
                        >
                            <LabelList
                                dataKey="candidates"
                                position="right"
                                offset={8}
                                className="fill-foreground font-bold"
                                fontSize={12}
                            />
                        </Bar>
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}
