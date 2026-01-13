"use client"

import { useState, useEffect } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Clock, Video, MapPin, User, ChevronRight, MoreHorizontal, Calendar as CalendarIcon, CheckCircle2, FileText, Brain, Award, Briefcase, Mail, Phone, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { collection, query, where, getDocs, doc, updateDoc, addDoc, deleteDoc, Timestamp, orderBy, onSnapshot, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Candidate } from "@/lib/mock-data"


// Interface for Interview
interface Interview {
    id: string
    candidateId: string
    candidateName: string
    role: string
    scheduledAt: Date
    duration: number // minutes
    type: 'video' | 'onsite'
    status: 'upcoming' | 'completed' | 'cancelled'
    interviewer: string
}

export default function InterviewsPage() {
    const [date, setDate] = useState<Date | undefined>(undefined)
    const [isMounted, setIsMounted] = useState(false)
    const [shortlistedCandidates, setShortlistedCandidates] = useState<Candidate[]>([])
    const [completedCandidates, setCompletedCandidates] = useState<Candidate[]>([])
    const [scheduledInterviews, setScheduledInterviews] = useState<Interview[]>([])

    useEffect(() => {
        setIsMounted(true)
        setDate(new Date())
    }, [])

    // Scheduling Modal State
    const [isScheduleOpen, setIsScheduleOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [selectedCandidateId, setSelectedCandidateId] = useState<string>("")
    const [interviewDate, setInterviewDate] = useState<string>("")
    const [interviewTime, setInterviewTime] = useState<string>("")
    const [interviewType, setInterviewType] = useState<'video' | 'onsite'>('video')

    // Reschedule Modal State
    const [isRescheduleOpen, setIsRescheduleOpen] = useState(false)
    const [rescheduleInterviewId, setRescheduleInterviewId] = useState<string>("")
    const [rescheduleDate, setRescheduleDate] = useState<string>("")
    const [rescheduleTime, setRescheduleTime] = useState<string>("")

    // Scores Modal State
    const [isScoresOpen, setIsScoresOpen] = useState(false)
    const [selectedCandidateValues, setSelectedCandidateValues] = useState<any>(null)
    const [isLoadingScores, setIsLoadingScores] = useState(false)

    // Review Modal State
    const [isReviewOpen, setIsReviewOpen] = useState(false)


    // Fetch Data
    useEffect(() => {
        let unsubscribeCandidates: () => void

        // 1. Fetch Interviews (Independent)
        const qInterviews = query(collection(db, "interviews"), orderBy("scheduledAt", "asc"))
        const unsubscribeInterviews = onSnapshot(qInterviews, (snapshot) => {
            const interviews = snapshot.docs.map(doc => {
                const data = doc.data()
                return {
                    id: doc.id,
                    ...data,
                    scheduledAt: data.scheduledAt?.toDate() || new Date()
                }
            }) as Interview[]
            setScheduledInterviews(interviews)
        })

        // 2. Fetch Jobs & Shortlisted Candidates (Dependent)
        const setupCandidates = async () => {
            // Fetch Jobs for Role Mapping
            const jobsSnapshot = await getDocs(collection(db, "jobs"))
            const jobMap: Record<string, string> = {}
            jobsSnapshot.forEach(doc => {
                jobMap[doc.id] = doc.data().title
            })

            // Fetch Shortlisted Candidates
            const qCandidates = query(collection(db, "applications"), where("pipelineState", "==", "shortlisted"))
            unsubscribeCandidates = onSnapshot(qCandidates, (snapshot) => {
                const candidates = snapshot.docs.map(doc => ({
                    id: doc.id,
                    name: doc.data().applicantName || "Unknown",
                    role: jobMap[doc.data().jobId] || "Unknown Role",
                    ...doc.data()
                })) as any[]
                setShortlistedCandidates(candidates)
            })

            // Fetch Completed Interviews Candidates
            const qCompleted = query(collection(db, "applications"), where("pipelineState", "==", "interview_completed"))
            onSnapshot(qCompleted, (snapshot) => {
                const candidates = snapshot.docs.map(doc => ({
                    id: doc.id,
                    name: doc.data().applicantName || "Unknown",
                    role: jobMap[doc.data().jobId] || "Unknown Role",
                    ...doc.data()
                })) as any[]
                setCompletedCandidates(candidates)
            })
        }

        setupCandidates()

        return () => {
            if (unsubscribeCandidates) unsubscribeCandidates()
            unsubscribeInterviews()
        }
    }, [])

    const handleSchedule = async () => {
        if (!selectedCandidateId || !interviewDate || !interviewTime) return

        setIsLoading(true)
        try {
            const candidate = shortlistedCandidates.find(c => c.id === selectedCandidateId)
            const scheduledDateTime = new Date(`${interviewDate}T${interviewTime}`)

            // 1. Create Interview Record
            await addDoc(collection(db, "interviews"), {
                candidateId: selectedCandidateId,
                candidateName: candidate?.name,
                role: candidate?.role || "Applicant",
                scheduledAt: Timestamp.fromDate(scheduledDateTime),
                duration: 45, // Default
                type: interviewType,
                status: 'upcoming',
                interviewer: "Hiring Manager", // Mock for now
                createdAt: Timestamp.now()
            })

            // 2. Update Candidate Status
            await updateDoc(doc(db, "applications", selectedCandidateId), {
                pipelineState: "interview_scheduled"
            })

            setIsScheduleOpen(false)
            // Reset form
            setSelectedCandidateId("")
            setInterviewDate("")
            setInterviewTime("")

        } catch (error) {
            console.error("Error scheduling interview:", error)
        } finally {
            setIsLoading(false)
        }
    }

    const openReschedule = (interview: Interview) => {
        setRescheduleInterviewId(interview.id)
        // Pre-fill current date/time
        const dt = interview.scheduledAt
        setRescheduleDate(dt.toISOString().split('T')[0])
        setRescheduleTime(dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }))
        setIsRescheduleOpen(true)
    }

    const handleRescheduleSubmit = async () => {
        if (!rescheduleInterviewId || !rescheduleDate || !rescheduleTime) return
        setIsLoading(true)
        try {
            const newDateTime = new Date(`${rescheduleDate}T${rescheduleTime}`)
            await updateDoc(doc(db, "interviews", rescheduleInterviewId), {
                scheduledAt: Timestamp.fromDate(newDateTime)
            })
            setIsRescheduleOpen(false)
        } catch (error) {
            console.error("Error rescheduling:", error)
        } finally {
            setIsLoading(false)
        }
    }

    // Helpers
    const getStatusConfig = (status: string) => {
        const configs: Record<string, { label: string, color: string }> = {
            'pending': { label: 'Pending Review', color: '#6B7280' },
            'reviewed': { label: 'Reviewed', color: '#8B5CF6' },
            'shortlisted': { label: 'Shortlisted', color: '#3B82F6' },
            'interviewed': { label: 'Interviewed', color: '#F59E0B' },
            'rejected': { label: 'Rejected', color: '#EF4444' },
            'hired': { label: 'Hired', color: '#10B981' },
            'interview_scheduled': { label: 'Interview Scheduled', color: '#8B5CF6' },
            'interview_completed': { label: 'Interview Completed', color: '#10B981' },
            'offer_sent': { label: 'Offer Sent', color: '#F59E0B' },
            'screened': { label: 'Screened', color: '#10B981' }
        }
        return configs[status] || { label: status, color: '#6B7280' }
    }

    const handleOffer = async (candidateId: string) => {
        try {
            await updateDoc(doc(db, "applications", candidateId), {
                pipelineState: "offer_sent"
            })
            setCompletedCandidates(prev => prev.filter(c => c.id !== candidateId))
        } catch (error) {
            console.error("Error sending offer:", error)
        }
    }

    const handleReject = async (candidateId: string) => {
        try {
            await updateDoc(doc(db, "applications", candidateId), {
                pipelineState: "rejected"
            })
            setCompletedCandidates(prev => prev.filter(c => c.id !== candidateId))
        } catch (error) {
            console.error("Error rejecting candidate:", error)
        }
    }

    const markInterviewCompleted = async (interviewId: string) => {
        const interview = scheduledInterviews.find(i => i.id === interviewId)
        if (!interview) return

        try {
            await updateDoc(doc(db, "interviews", interviewId), {
                status: "completed"
            })
            // Update candidate status
            await updateDoc(doc(db, "applications", interview.candidateId), {
                pipelineState: "interview_completed"
            })

            // Optimistically update local state
            setScheduledInterviews(prev => prev.map(i =>
                i.id === interviewId ? { ...i, status: 'completed' } : i
            ))
        } catch (error) {
            console.error("Error marking interview as completed:", error)
        }
    }

    const cancelInterview = async (interview: Interview) => {
        if (!confirm("Are you sure you want to cancel this interview?")) return
        try {
            // 1. Delete interview
            await deleteDoc(doc(db, "interviews", interview.id))

            // 2. Revert candidate status
            await updateDoc(doc(db, "applications", interview.candidateId), {
                pipelineState: "screened"
            })

            // 3. Update local state
            setScheduledInterviews(prev => prev.filter(i => i.id !== interview.id))
        } catch (error) {
            console.error("Error cancelling interview:", error)
        }
    }

    const getScoreColor = (score: number) => {
        if (score >= 80) return { bg: 'bg-green-500', text: 'text-green-600', border: 'border-green-200', lightBg: 'bg-green-50' }
        if (score >= 60) return { bg: 'bg-yellow-500', text: 'text-yellow-600', border: 'border-yellow-200', lightBg: 'bg-yellow-50' }
        return { bg: 'bg-red-500', text: 'text-red-600', border: 'border-red-200', lightBg: 'bg-red-50' }
    }

    const openScores = async (candidateId: string) => {
        setIsScoresOpen(true)
        setIsLoadingScores(true)
        setSelectedCandidateValues(null)
        try {
            const docRef = doc(db, "applications", candidateId)
            const docSnap = await getDoc(docRef)
            if (docSnap.exists()) {
                const data = docSnap.data()
                // Map to UI Candidate structure
                const mappedCandidate = {
                    id: docSnap.id,
                    name: data.applicantName || "Unknown",
                    email: data.applicantEmail || "",
                    phone: data.applicantPhone || "",
                    role: data.role || "Applicant", // Might need to fetch job title if not in data
                    location: data.location || "Remote",
                    appliedDate: data.submittedAt ? data.submittedAt.toDate().toLocaleDateString() : "N/A",
                    status: data.pipelineState || "pending",
                    overallScore: data.layer2?.semanticScore ? Math.round(data.layer2.semanticScore * 100) : 0,
                    resumeAnalysis: {
                        skillsFound: data.layer2?.extractedData?.skills || [],
                        experienceYears: data.layer2?.extractedData?.experience_years ??
                            (Array.isArray(data.layer2?.extractedData?.experience)
                                ? data.layer2.extractedData.experience.reduce((acc: number, curr: any) => acc + (Number(curr.duration) || 0), 0)
                                : 0),
                        educationMatch: Array.isArray(data.layer2?.extractedData?.education) && data.layer2.extractedData.education.length > 0
                            ? data.layer2.extractedData.education.map((e: any) => `${e.degree} - ${e.course} (${e.year})`).join("\n")
                            : "No education listed",
                        keywordMatch: Math.round(((data.layer2?.breakdown?.semantic?.skill_similarity || 0) + (data.layer2?.breakdown?.semantic?.description_focus_similarity || 0)) * 50),
                        skillSimilarity: Math.round((data.layer2?.breakdown?.semantic?.skill_similarity || 0) * 100),
                        descriptionFocus: Math.round((data.layer2?.breakdown?.semantic?.description_focus_similarity || 0) * 100),
                        extractedData: data.layer2?.extractedData
                    },
                    videoAnalysis: data.layer3?.videoAnalysis || null,
                    videoScore: data.layer3?.videoScore || 0,
                    portfolioAnalysis: data.layer3?.portfolioAnalysis || null
                }
                setSelectedCandidateValues(mappedCandidate)
            }
        } catch (error) {
            console.error("Error fetching scores:", error)
        } finally {
            setIsLoadingScores(false)
        }
    }

    // Filter interviews for selected date
    const dayInterviews = scheduledInterviews.filter(i =>
        date && i.scheduledAt.toDateString() === date.toDateString() && i.status !== 'completed'
    )

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-foreground">Interviews</h1>
                    <p className="text-muted-foreground">Manage your interview schedule</p>
                </div>
                <div className="flex gap-2">
                    <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="border-green-500 text-green-600 hover:bg-green-50">
                                Review Interviews ({completedCandidates.length})
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[600px]">
                            <DialogHeader>
                                <DialogTitle>Review Interviewed Candidates</DialogTitle>
                                <DialogDescription>
                                    Review candidates who have completed their interviews.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="max-h-[60vh] overflow-y-auto space-y-4 py-4">
                                {completedCandidates.length === 0 ? (
                                    <div className="text-center text-muted-foreground py-8">
                                        No candidates waiting for review.
                                    </div>
                                ) : (
                                    completedCandidates.map(candidate => (
                                        <div key={candidate.id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                                            <div className="space-y-1">
                                                <h4 className="font-semibold">{candidate.name}</h4>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Badge variant="secondary">{candidate.role}</Badge>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="destructive" onClick={() => handleReject(candidate.id)}>Reject</Button>
                                                <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleOffer(candidate.id)}>Offer</Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-[#3B82F6] hover:bg-[#2563EB] text-white">Schedule Interview</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Schedule Interview</DialogTitle>
                                <DialogDescription>
                                    Select a shortlisted candidate and choose a time.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="candidate">Candidate</Label>
                                    <Select value={selectedCandidateId} onValueChange={setSelectedCandidateId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select candidate" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {shortlistedCandidates.length === 0 ? (
                                                <SelectItem value="none" disabled>No shortlisted candidates</SelectItem>
                                            ) : (
                                                shortlistedCandidates.map(candidate => (
                                                    <SelectItem key={candidate.id} value={candidate.id}>
                                                        {candidate.name} - {candidate.role}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="date">Date</Label>
                                        <Input
                                            id="date"
                                            type="date"
                                            value={interviewDate}
                                            onChange={(e) => setInterviewDate(e.target.value)}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="time">Time</Label>
                                        <Input
                                            id="time"
                                            type="time"
                                            value={interviewTime}
                                            onChange={(e) => setInterviewTime(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="type">Interview Type</Label>
                                    <Select value={interviewType} onValueChange={(val: any) => setInterviewType(val)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="video">Video Call (Google Meet)</SelectItem>
                                            <SelectItem value="onsite">On-site Interview</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" onClick={handleSchedule} disabled={isLoading || !selectedCandidateId}>
                                    {isLoading ? "Scheduling..." : "Schedule"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
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
                            {isMounted && (
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={setDate}
                                    className="rounded-md border shadow-sm mx-auto"
                                />
                            )}

                            <div className="mt-6 space-y-4">
                                <h3 className="font-semibold text-sm text-muted-foreground">Stats</h3>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/30">
                                        <div className="flex items-center gap-2">
                                            <Video className="w-4 h-4 text-blue-500" />
                                            <span>Video Calls</span>
                                        </div>
                                        <span className="font-medium">{scheduledInterviews.filter(i => i.type === 'video').length}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/30">
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-green-500" />
                                            <span>On-site</span>
                                        </div>
                                        <span className="font-medium">{scheduledInterviews.filter(i => i.type === 'onsite').length}</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Schedule Feed */}
                <div className="lg:col-span-8 xl:col-span-9 space-y-4">
                    <Card className="border-border bg-card min-h-[500px]">
                        <CardHeader className="pb-3 border-b border-border/50">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg">
                                    Schedule for {date?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                </CardTitle>
                                <Badge variant="secondary">{dayInterviews.length} Interviews</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {dayInterviews.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                                    <CalendarIcon className="h-12 w-12 mb-4 opacity-20" />
                                    <p>No interviews scheduled for this day.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-border/50">
                                    {dayInterviews.map((interview) => (
                                        <div key={interview.id} className="p-4 flex items-start gap-4 hover:bg-muted/30 transition-colors group">
                                            <div className="flex flex-col items-center min-w-[80px] pt-1">
                                                <span className="text-sm font-semibold">
                                                    {interview.scheduledAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                                </span>
                                                <span className="text-xs text-muted-foreground">{interview.duration}m</span>
                                            </div>

                                            <div className="flex-1 min-w-0 space-y-1">
                                                <div className="flex items-start justify-between">
                                                    <h3 className="font-medium truncate pr-4">Interview with {interview.candidateName}</h3>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => openReschedule(interview)}>
                                                                Reschedule
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => openScores(interview.candidateId)}>
                                                                View Scores
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => markInterviewCompleted(interview.id)}>
                                                                Mark as Completed
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => cancelInterview(interview)} className="text-red-600 focus:text-red-600">
                                                                Cancel Interview
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>

                                                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                                                    <div className="flex items-center gap-2">
                                                        <User className="h-3.5 w-3.5" />
                                                        <span className="text-foreground/80">{interview.role}</span>
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
                                                                {interview.candidateName?.substring(0, 2).toUpperCase() || "CN"}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                    </div>
                                                    <span className="text-xs text-muted-foreground ml-2">Interviewer: {interview.interviewer}</span>
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
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Reschedule Dialog */}
            <Dialog open={isRescheduleOpen} onOpenChange={setIsRescheduleOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Reschedule Interview</DialogTitle>
                        <DialogDescription>
                            Choose a new date and time for this interview.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="r-date">Date</Label>
                                <Input
                                    id="r-date"
                                    type="date"
                                    value={rescheduleDate}
                                    onChange={(e) => setRescheduleDate(e.target.value)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="r-time">Time</Label>
                                <Input
                                    id="r-time"
                                    type="time"
                                    value={rescheduleTime}
                                    onChange={(e) => setRescheduleTime(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" onClick={handleRescheduleSubmit} disabled={isLoading}>
                            {isLoading ? "Saving..." : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* View Scores Dialog */}
            <Dialog open={isScoresOpen} onOpenChange={setIsScoresOpen}>
                <DialogContent className="w-[65vw] max-w-[1000px] sm:max-w-[65vw] h-[95vh] flex flex-col p-0 gap-0">
                    <DialogHeader className="p-6 pb-4 border-b border-border bg-muted/10">
                        {selectedCandidateValues ? (
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-4">
                                    <div className="flex -space-x-2">
                                        <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xl font-bold border-2 border-white shadow-sm">
                                            {(selectedCandidateValues.name || "Unknown").split(" ").map((n: string) => n[0]).join("")}
                                        </div>
                                    </div>
                                    <div>
                                        <DialogTitle className="text-2xl font-bold">{selectedCandidateValues.name}</DialogTitle>
                                        <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                                            <Briefcase className="h-4 w-4" />
                                            <span>{selectedCandidateValues.role}</span>
                                        </div>
                                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-1.5">
                                                <Mail className="h-3.5 w-3.5" />
                                                {selectedCandidateValues.email}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Phone className="h-3.5 w-3.5" />
                                                {selectedCandidateValues.phone}
                                            </div>
                                        </div>
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            <Badge variant="outline" className="bg-muted text-muted-foreground">
                                                {selectedCandidateValues.resumeAnalysis?.experienceYears || 0} YOE
                                            </Badge>
                                            <Badge variant="outline" className="bg-muted text-muted-foreground">
                                                {selectedCandidateValues.location}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <Badge variant="outline" className={cn("px-3 py-1 text-sm font-medium",
                                        getStatusConfig(selectedCandidateValues.status).color === '#10B981' ? "bg-green-500/10 text-green-500 border-green-500/20" :
                                            getStatusConfig(selectedCandidateValues.status).color === '#3B82F6' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : "bg-muted text-muted-foreground"
                                    )}>
                                        {getStatusConfig(selectedCandidateValues.status).label}
                                    </Badge>
                                    <div className="text-right mt-1">
                                        <div className="text-xs text-muted-foreground mb-0.5">Match Score</div>
                                        <div className={cn("text-2xl font-bold", getScoreColor(selectedCandidateValues.overallScore).text)}>
                                            {selectedCandidateValues.overallScore}%
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <DialogTitle>Loading...</DialogTitle>
                        )}
                    </DialogHeader>

                    {isLoadingScores ? (
                        <div className="flex justify-center p-8">Loading scores...</div>
                    ) : selectedCandidateValues ? (
                        <div className="flex-1 overflow-hidden">
                            <Tabs defaultValue="overview" className="h-full flex flex-col">
                                <div className="px-6 py-4">
                                    <TabsList className="w-full grid grid-cols-3 h-12 bg-muted/40 p-1.5 rounded-xl gap-2">
                                        <TabsTrigger value="overview">Overview</TabsTrigger>
                                        <TabsTrigger value="video">Video Analysis</TabsTrigger>
                                        <TabsTrigger value="portfolio">Portfolio Analysis</TabsTrigger>
                                    </TabsList>
                                </div>

                                <div className="flex-1 overflow-y-auto">
                                    <div className="p-6">
                                        <TabsContent value="overview" className="m-0 space-y-8">
                                            {/* Resume Highlights */}
                                            <section>
                                                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                                    <FileText className="h-5 w-5 text-primary" />
                                                    Resume Highlights
                                                </h3>
                                                <div className="grid grid-cols-2 gap-6">
                                                    <div className="space-y-4">
                                                        <div>
                                                            <div className="flex items-center justify-between mb-2">
                                                                <div className="text-sm font-medium text-muted-foreground">Skills Identified</div>
                                                                <Badge variant="outline" className="bg-primary/5">
                                                                    {selectedCandidateValues.resumeAnalysis.skillSimilarity ?? 0}% Match
                                                                </Badge>
                                                            </div>
                                                            <div className="flex flex-wrap gap-2">
                                                                {(selectedCandidateValues.resumeAnalysis.extractedData?.skills || selectedCandidateValues.resumeAnalysis.skillsFound).map((skill: string) => (
                                                                    <Badge key={skill} variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">
                                                                        {skill}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="flex justify-between text-sm mb-2">
                                                                <span className="text-muted-foreground">Description Focus</span>
                                                                <span className="font-medium">{selectedCandidateValues.resumeAnalysis.descriptionFocus ?? selectedCandidateValues.resumeAnalysis.keywordMatch}%</span>
                                                            </div>
                                                            <Progress value={selectedCandidateValues.resumeAnalysis.descriptionFocus ?? selectedCandidateValues.resumeAnalysis.keywordMatch} className="h-2" />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-6">
                                                        <div className="grid grid-cols-1 gap-4">
                                                            {/* Experience Section */}
                                                            <div className="p-4 rounded-lg bg-muted/40 border border-border">
                                                                <div className="text-sm text-muted-foreground mb-2">Experience</div>
                                                                {selectedCandidateValues.resumeAnalysis.extractedData?.experience ? (
                                                                    <div className="space-y-3">
                                                                        {selectedCandidateValues.resumeAnalysis.extractedData.experience.map((exp: any, i: number) => (
                                                                            <div key={i} className="text-sm border-l-2 border-primary/20 pl-3">
                                                                                <div className="font-medium">{exp.title}</div>
                                                                                <div className="text-muted-foreground text-xs">{exp.duration} Years</div>
                                                                                <div className="text-xs text-muted-foreground/80 mt-1 line-clamp-2">{exp.focus || exp.description}</div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <div className="text-2xl font-bold">{selectedCandidateValues.resumeAnalysis.experienceYears} Years</div>
                                                                )}
                                                            </div>

                                                            {/* Education Section */}
                                                            <div className="p-4 rounded-lg bg-muted/40 border border-border">
                                                                <div className="text-sm text-muted-foreground mb-2">Education</div>
                                                                {selectedCandidateValues.resumeAnalysis.extractedData?.education ? (
                                                                    <div className="space-y-3">
                                                                        {selectedCandidateValues.resumeAnalysis.extractedData.education.map((edu: any, i: number) => (
                                                                            <div key={i} className="text-sm">
                                                                                <div className="font-medium">{edu.degree}</div>
                                                                                <div className="text-xs text-muted-foreground">{edu.course} • {edu.year}</div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <div className="text-sm font-medium whitespace-pre-wrap leading-relaxed text-foreground/90">
                                                                        {selectedCandidateValues.resumeAnalysis.educationMatch}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </section>
                                        </TabsContent>

                                        <TabsContent value="video" className="m-0 space-y-8">
                                            <div className="grid grid-cols-1 gap-6">
                                                <div className="p-6 rounded-xl border border-border bg-card">
                                                    <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                                                        <Video className="h-5 w-5 text-blue-500" />
                                                        Video Analysis
                                                    </h3>
                                                    {selectedCandidateValues.videoAnalysis?.details ? (
                                                        <div className="space-y-4 mb-6">
                                                            <div className="flex items-center justify-between p-4 rounded-lg bg-blue-500/5 border border-blue-500/10">
                                                                <span className="text-sm font-medium text-blue-700">Interview Score</span>
                                                                <span className="text-2xl font-bold text-blue-700">
                                                                    {selectedCandidateValues.videoAnalysis.overallConfidence}/100
                                                                </span>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-3 text-sm">
                                                                <div className="p-3 bg-muted/30 rounded-lg">
                                                                    <div className="text-xs text-muted-foreground mb-1">Structure</div>
                                                                    <div className="font-medium">{selectedCandidateValues.videoAnalysis.details.substance?.structure_score ?? "-"}/10</div>
                                                                </div>
                                                                <div className="p-3 bg-muted/30 rounded-lg">
                                                                    <div className="text-xs text-muted-foreground mb-1">Relevance</div>
                                                                    <div className="font-medium">{selectedCandidateValues.videoAnalysis.details.substance?.relevance_score ?? "-"}/10</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-center p-8 text-muted-foreground bg-muted/20 rounded-lg border border-dashed text-sm">
                                                            No video analysis data available.
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </TabsContent>

                                        <TabsContent value="portfolio" className="m-0 space-y-8">
                                            <div className="p-6 rounded-xl border border-border bg-card">
                                                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                                                    <Award className="h-5 w-5 text-purple-600" />
                                                    Portfolio Analysis
                                                </h3>
                                                {selectedCandidateValues.portfolioAnalysis ? (
                                                    <div className="text-sm whitespace-pre-wrap leading-relaxed">
                                                        {typeof selectedCandidateValues.portfolioAnalysis === 'string'
                                                            ? selectedCandidateValues.portfolioAnalysis
                                                            : JSON.stringify(selectedCandidateValues.portfolioAnalysis, null, 2)}
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-center p-8 text-muted-foreground bg-muted/20 rounded-lg border border-dashed text-sm">
                                                        No portfolio analysis available.
                                                    </div>
                                                )}
                                            </div>
                                        </TabsContent>
                                    </div>
                                </div>
                            </Tabs>
                        </div>
                    ) : (
                        <div className="flex justify-center p-8 text-muted-foreground">No data found</div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
