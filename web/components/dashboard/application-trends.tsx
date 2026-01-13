"use client"

import { useEffect, useState } from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart"
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"

const chartConfig = {
    applications: {
        label: "Applications",
        color: "#3B82F6",
    },
} satisfies ChartConfig

export function ApplicationTrends() {
    const [chartData, setChartData] = useState<{ date: string; applications: number }[]>([])

    useEffect(() => {
        const fetchData = async () => {
            const endDate = new Date()
            const startDate = new Date()
            startDate.setDate(endDate.getDate() - 6) // Past 7 days including today

            // Create a map of the last 7 days initialized to 0
            const dateMap = new Map<string, number>()
            for (let i = 0; i < 7; i++) {
                const d = new Date(startDate)
                d.setDate(startDate.getDate() + i)
                dateMap.set(d.toISOString().split('T')[0], 0)
            }

            try {
                // Firestore query for last 7 days
                // Note: submittedAt is a Timestamp
                const startTimestamp = Timestamp.fromDate(startDate)
                const q = query(
                    collection(db, "applications"),
                    where("submittedAt", ">=", startTimestamp)
                )

                const querySnapshot = await getDocs(q)

                querySnapshot.forEach((doc) => {
                    const data = doc.data()
                    if (data.submittedAt) {
                        const date = data.submittedAt.toDate().toISOString().split('T')[0]
                        if (dateMap.has(date)) {
                            dateMap.set(date, (dateMap.get(date) || 0) + 1)
                        }
                    }
                })

                // Convert map to array
                const processedData = Array.from(dateMap.entries()).map(([date, count]) => ({
                    date,
                    applications: count
                }))

                setChartData(processedData)

            } catch (error) {
                console.error("Error fetching application trends:", error)
            }
        }

        fetchData()
    }, [])

    return (
        <Card className="col-span-1 md:col-span-2 lg:col-span-4 border-border/50">
            <CardHeader>
                <CardTitle>Application Trends</CardTitle>
                <CardDescription>
                    Daily application volume for the last 7 days.
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
