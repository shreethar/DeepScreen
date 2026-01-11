"use client"

import { useState } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Clock, Video, MapPin, User, ChevronRight, MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"

// Mock interviews data
const interviews = [
    {
        id: "1",
        time: "10:00 AM",
        duration: "45m",
        title: "Technical Interview - AI Engineer",
        candidate: "Sarah Chen",
        interviewer: "Mike Ross",
        type: "video",
        status: "upcoming"
    },
    {
        id: "2",
        time: "11:30 AM",
        duration: "30m",
        title: "Screening Call - Product Designer",
        candidate: "Emily Wang",
        interviewer: "Jessica Pearson",
        type: "video",
        status: "upcoming"
    },
    {
        id: "3",
        time: "02:00 PM",
        duration: "1h",
        title: "System Design - Backend Lead",
        candidate: "David Kim",
        interviewer: "Harvey Specter",
        type: "onsite",
        status: "upcoming"
    },
    {
        id: "4",
        time: "04:00 PM",
        duration: "30m",
        title: "Culture Fit - Data Scientist",
        candidate: "Rachel Zane",
        interviewer: "Louis Litt",
        type: "video",
        status: "completed"
    }
]

export default function InterviewsPage() {
    const [date, setDate] = useState<Date | undefined>(new Date())

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-foreground">Interviews</h1>
                    <p className="text-muted-foreground">Manage your interview schedule</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">Sync Calendar</Button>
                    <Button className="bg-[#3B82F6] hover:bg-[#2563EB] text-white">Schedule Interview</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Calendar Sidebar */}
                <div className="lg:col-span-4 xl:col-span-3">
                    <Card className="border-border">
                        <CardHeader>
                            <CardTitle>Calendar</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={setDate}
                                className="rounded-md border shadow-sm mx-auto"
                            />

                            <div className="mt-6 space-y-4">
                                <h3 className="font-semibold text-sm text-muted-foreground">Upcoming Categories</h3>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm p-2 rounded-md hover:bg-muted/50 cursor-pointer">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                            <span>Screening</span>
                                        </div>
                                        <span className="text-muted-foreground">3</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm p-2 rounded-md hover:bg-muted/50 cursor-pointer">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                                            <span>Technical</span>
                                        </div>
                                        <span className="text-muted-foreground">5</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm p-2 rounded-md hover:bg-muted/50 cursor-pointer">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                            <span>Onsite</span>
                                        </div>
                                        <span className="text-muted-foreground">2</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Schedule Feed */}
                <div className="lg:col-span-8 xl:col-span-9 space-y-4">
                    <Card className="border-border bg-card">
                        <CardHeader className="pb-3 border-b border-border/50">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg">
                                    Schedule for {date?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                </CardTitle>
                                <Badge variant="secondary">{interviews.length} Interviews</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-border/50">
                                {interviews.map((interview) => (
                                    <div key={interview.id} className="p-4 flex items-start gap-4 hover:bg-muted/30 transition-colors group">
                                        <div className="flex flex-col items-center min-w-[80px] pt-1">
                                            <span className="text-sm font-semibold">{interview.time}</span>
                                            <span className="text-xs text-muted-foreground">{interview.duration}</span>
                                        </div>

                                        <div className="flex-1 min-w-0 space-y-1">
                                            <div className="flex items-start justify-between">
                                                <h3 className="font-medium truncate pr-4">{interview.title}</h3>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </div>

                                            <div className="flex items-center gap-6 text-sm text-muted-foreground">
                                                <div className="flex items-center gap-2">
                                                    <User className="h-3.5 w-3.5" />
                                                    <span className="text-foreground/80">{interview.candidate}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {interview.type === 'video' ? <Video className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
                                                    <span>{interview.type === 'video' ? 'Google Meet' : 'Office 3B'}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 pt-2">
                                                <div className="flex -space-x-2">
                                                    <Avatar className="h-6 w-6 border-2 border-background">
                                                        <AvatarFallback className="bg-primary/10 text-xs text-primary">
                                                            {interview.candidate.split(' ')[0][0]}{interview.candidate.split(' ')[1][0]}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <Avatar className="h-6 w-6 border-2 border-background">
                                                        <AvatarFallback className="bg-muted text-xs">
                                                            {interview.interviewer.split(' ')[0][0]}{interview.interviewer.split(' ')[1][0]}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                </div>
                                                <span className="text-xs text-muted-foreground ml-2">Standard Interview Panel</span>
                                            </div>
                                        </div>

                                        <div className="self-center pl-4">
                                            <Button size="sm" variant={interview.status === 'upcoming' ? 'default' : 'outline'} className={cn(
                                                interview.status === 'upcoming' ? "bg-primary/10 text-primary hover:bg-primary/20 border-0" : ""
                                            )}>
                                                {interview.status === 'upcoming' ? (
                                                    <span className="flex items-center gap-2">Join <ChevronRight className="h-3 w-3" /></span>
                                                ) : "View Notes"}
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
