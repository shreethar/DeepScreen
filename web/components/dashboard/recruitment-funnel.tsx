"use client"

import { Bar, BarChart, XAxis, YAxis, LabelList, CartesianGrid } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart"

const funnelData = [
    { stage: "Applied", candidates: 450, fill: "#3B82F6" },
    { stage: "Screening", candidates: 210, fill: "#60A5FA" },
    { stage: "Interview", candidates: 85, fill: "#818CF8" },
    { stage: "Offer", candidates: 24, fill: "#A78BFA" },
    { stage: "Hired", candidates: 12, fill: "#10B981" },
]

const chartConfig = {
    candidates: {
        label: "Candidates",
        color: "hsl(var(--chart-1))",
    },
} satisfies ChartConfig

export function RecruitmentFunnel() {
    return (
        <Card className="col-span-1 md:col-span-2 lg:col-span-2 border-border/50">
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
