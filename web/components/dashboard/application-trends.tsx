"use client"

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart"

const chartData = [
    { date: "2024-03-01", applications: 12 },
    { date: "2024-03-02", applications: 15 },
    { date: "2024-03-03", applications: 8 },
    { date: "2024-03-04", applications: 22 },
    { date: "2024-03-05", applications: 25 },
    { date: "2024-03-06", applications: 18 },
    { date: "2024-03-07", applications: 30 },
    { date: "2024-03-08", applications: 28 },
    { date: "2024-03-09", applications: 15 },
    { date: "2024-03-10", applications: 12 },
    { date: "2024-03-11", applications: 35 },
    { date: "2024-03-12", applications: 40 },
    { date: "2024-03-13", applications: 32 },
    { date: "2024-03-14", applications: 45 },
    { date: "2024-03-15", applications: 42 },
]

const chartConfig = {
    applications: {
        label: "Applications",
        color: "#3B82F6",
    },
} satisfies ChartConfig

export function ApplicationTrends() {
    return (
        <Card className="col-span-1 md:col-span-2 lg:col-span-4 border-border/50">
            <CardHeader>
                <CardTitle>Application Trends</CardTitle>
                <CardDescription>
                    Daily application volume for the last 15 days.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                    <AreaChart
                        data={chartData}
                        margin={{
                            top: 10,
                            right: 10,
                            left: 0,
                            bottom: 0,
                        }}
                    >
                        <defs>
                            <linearGradient id="fillApplications" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--color-applications)" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="var(--color-applications)" stopOpacity={0.05} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e5e5e5" />
                        <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            minTickGap={32}
                            tickFormatter={(value) => {
                                const date = new Date(value)
                                return date.toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                })
                            }}
                        />
                        <ChartTooltip
                            content={<ChartTooltipContent indicator="dot" />}
                        />
                        <Area
                            dataKey="applications"
                            type="natural"
                            fill="url(#fillApplications)"
                            fillOpacity={0.4}
                            stroke="var(--color-applications)"
                            strokeWidth={2}
                            stackId="a"
                        />
                    </AreaChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}
