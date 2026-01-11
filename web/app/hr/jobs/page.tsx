"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Users, Clock, Plus, Calendar, MapPin, DollarSign, ChevronRight } from "lucide-react"
import { collection, query, where, onSnapshot, Timestamp, addDoc, getDocs } from "firebase/firestore"
import { onAuthStateChanged } from "firebase/auth"
import { auth, db } from "@/lib/firebase"
import { toast } from "sonner"

interface Job {
    id: string
    title: string
    department: string
    applicants: number
    daysOpen: number
    status: "active" | "draft"
    location: string
    type: string
    salary: string
    description: string
    postedDate: string
    requirements: string[]
    createdAt?: Timestamp
    recruiterId?: string
    applicantList: {
        id: string
        name: string
        email: string
        status: string
        appliedDate: string
        matchScore: number
    }[]
}

export default function HRJobsPage() {
    const [jobs, setJobs] = useState<Job[]>([])
    const [selectedJob, setSelectedJob] = useState<Job | null>(null)
    const [loading, setLoading] = useState(true)
    const [user, setUser] = useState<any>(null)
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Form states
    const [newJobTitle, setNewJobTitle] = useState("")
    const [newJobDescription, setNewJobDescription] = useState("")
    const [newJobLocation, setNewJobLocation] = useState("")
    const [newJobType, setNewJobType] = useState("Full-time")
    const [newJobSalary, setNewJobSalary] = useState("")
    const [newJobMaxApplicants, setNewJobMaxApplicants] = useState("")

    const handleCreateJob = async (status: "active" | "draft") => {
        if (!user || !newJobTitle || !newJobDescription) {
            toast.error("Please fill in all required fields")
            return
        }

        setIsSubmitting(true)

        try {
            // Create date at 00:00:00 of today
            const now = new Date()
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)

            // Parse max applicants
            const maxApplicants = newJobMaxApplicants ? parseInt(newJobMaxApplicants) : 0

            const newJobData = {
                title: newJobTitle,
                description: newJobDescription,
                location: newJobLocation || "Remote",
                type: newJobType,
                salary: newJobSalary || "Not specified",
                status: status,
                recruiterId: user.uid,
                createdAt: Timestamp.fromDate(todayStart),
                applicantCount: 0,
                maxApplicant: maxApplicants,
                applicantList: []
            }

            await addDoc(collection(db, "jobs"), newJobData)

            toast.success(`Job ${status === 'active' ? 'published' : 'saved as draft'} successfully!`)

            // Reset form
            setNewJobTitle("")
            setNewJobDescription("")
            setNewJobLocation("")
            setNewJobType("Full-time")
            setNewJobSalary("")
            setNewJobMaxApplicants("")
            setIsCreateOpen(false)

        } catch (error: any) {
            console.error("Error creating job:", error)
            toast.error("Failed to create job", {
                description: error.message
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser)
            if (!currentUser) {
                setLoading(false)
                setJobs([])
            }
        })
        return () => unsubscribeAuth()
    }, [])

    useEffect(() => {
        if (!user) return

        const q = query(collection(db, "jobs"), where("recruiterId", "==", user.uid))

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const jobsData = snapshot.docs.map((doc) => {
                const data = doc.data()

                // Calculate days open
                let daysOpen = 0
                if (data.createdAt) {
                    const now = new Date()
                    const posted = data.createdAt.toDate()
                    const diffTime = Math.abs(now.getTime() - posted.getTime())
                    daysOpen = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                }

                return {
                    id: doc.id,
                    title: data.title || "Untitled Job",
                    department: data.department || "General",
                    applicants: data.applicantCount || 0,
                    daysOpen: daysOpen,
                    status: data.status || "draft",
                    location: data.location || "Remote",
                    type: data.type || "Full-time",
                    salary: data.salary || "Not specified",
                    description: data.description || "",
                    postedDate: data.createdAt ? data.createdAt.toDate().toLocaleDateString() : "Just now",
                    requirements: data.requirements || [],
                    createdAt: data.createdAt,
                    recruiterId: data.recruiterId,
                    applicantList: data.applicantList || [], // Expecting this might be empty for now
                } as Job
            })
            setJobs(jobsData)
            setLoading(false)
        }, (error) => {
            console.error("Error fetching jobs:", error)
            toast.error("Failed to load jobs")
            setLoading(false)
        })

        return () => unsubscribe()
        return () => unsubscribe()
    }, [user])

    // Fetch applicants when a job is selected
    useEffect(() => {
        if (!selectedJob) return

        const fetchApplicants = async () => {
            try {
                const q = query(collection(db, "applications"), where("jobId", "==", selectedJob.id))
                const querySnapshot = await getDocs(q)

                // Sort by submittedAt descending (newest first)
                const sortedDocs = querySnapshot.docs.sort((a, b) => {
                    const dateA = a.data().submittedAt?.toDate()?.getTime() || 0
                    const dateB = b.data().submittedAt?.toDate()?.getTime() || 0
                    return dateB - dateA
                })

                const applicants = sortedDocs.map(doc => {
                    const data = doc.data()
                    return {
                        id: doc.id,
                        name: data.applicantName || "Unknown",
                        email: data.applicantEmail || "",
                        status: data.pipelineState || "Applied",
                        appliedDate: data.submittedAt ? data.submittedAt.toDate().toLocaleDateString() : "N/A",
                        matchScore: data.layer2?.semanticScore ? Math.round(data.layer2.semanticScore * 100) : 0
                    }
                })

                setSelectedJob(prev => prev ? { ...prev, applicantList: applicants } : null)
            } catch (error) {
                console.error("Error fetching applicants:", error)
            }
        }

        fetchApplicants()
    }, [selectedJob?.id])

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground">Loading your jobs...</div>
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-foreground">Jobs</h1>
                    <p className="text-muted-foreground">Manage open positions and view applicants</p>
                </div>
                <Button onClick={() => setIsCreateOpen(true)} className="gap-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white">
                    <Plus className="h-4 w-4" />
                    Create Job
                </Button>
            </div>

            {jobs.length === 0 ? (
                <div className="text-center py-12 border border-dashed rounded-lg">
                    <h3 className="text-lg font-medium text-muted-foreground">No jobs found</h3>
                    <p className="text-sm text-muted-foreground mt-1">You haven't posted any jobs yet.</p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {jobs.map((job) => (
                        <Card
                            key={job.id}
                            className="border-border bg-card hover:shadow-md transition-all cursor-pointer hover:border-primary/50"
                            onClick={() => setSelectedJob(job)}
                        >
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <CardTitle className="text-base text-foreground">{job.title}</CardTitle>
                                        <p className="text-sm text-muted-foreground mt-1">{job.department}</p>
                                    </div>
                                    <Badge
                                        variant="outline"
                                        className={
                                            job.status === "active"
                                                ? "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30"
                                                : "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30"
                                        }
                                    >
                                        {job.status === "active" ? "Active" : "Draft"}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1.5">
                                        <Users className="h-4 w-4" />
                                        {job.applicants} applicants
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <Clock className="h-4 w-4" />
                                        {job.daysOpen}d open
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <Dialog open={!!selectedJob} onOpenChange={(open) => !open && setSelectedJob(null)}>
                <DialogContent className="w-[90vw] max-w-[1400px] sm:max-w-[90vw] md:max-w-[1400px] max-h-[85vh] flex flex-col p-0 gap-0">
                    <DialogHeader className="p-6 pb-2 border-b border-border">
                        <div className="flex items-start justify-between">
                            <div>
                                <DialogTitle className="text-2xl font-bold">{selectedJob?.title}</DialogTitle>
                                <DialogDescription className="mt-1 flex items-center gap-2">
                                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {selectedJob?.location}</span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {selectedJob?.type}</span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" /> {selectedJob?.salary}</span>
                                </DialogDescription>
                            </div>
                            <Badge
                                variant="outline"
                                className={
                                    selectedJob?.status === "active"
                                        ? "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30"
                                        : "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30"
                                }
                            >
                                {selectedJob?.status === "active" ? "Active" : "Draft"}
                            </Badge>
                        </div>
                    </DialogHeader>

                    <ScrollArea className="flex-1 overflow-y-auto">
                        <div className="p-6 space-y-8">
                            <div className="grid grid-cols-3 gap-6">
                                <div className="col-span-2 space-y-6">
                                    <div>
                                        <h3 className="font-semibold text-lg mb-2">About the Role</h3>
                                        <p className="text-muted-foreground leading-relaxed">
                                            {selectedJob?.description}
                                        </p>
                                    </div>
                                </div>

                                <div className="col-span-1 space-y-4">
                                    <Card className="bg-muted/50 border-border">
                                        <CardContent className="p-4 space-y-3">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Posted</span>
                                                <span className="font-medium">{selectedJob?.postedDate}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Applicants</span>
                                                <span className="font-medium">{selectedJob?.applicants}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Days Open</span>
                                                <span className="font-medium">{selectedJob?.daysOpen}</span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>

                            <div className="border-t border-border pt-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-semibold text-lg">Recent Applicants</h3>
                                    <Button variant="ghost" size="sm" className="gap-1 text-primary" asChild>
                                        <Link href={`/hr/candidates?role=${encodeURIComponent(selectedJob?.title || "")}`}>
                                            View All <ChevronRight className="h-4 w-4" />
                                        </Link>
                                    </Button>
                                </div>
                                <div className="space-y-3">
                                    {selectedJob?.applicantList && selectedJob.applicantList.length > 0 ? (
                                        selectedJob.applicantList.slice(0, 5).map((applicant) => (
                                            <div key={applicant.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-xs">
                                                        {applicant.name.split(' ').map(n => n[0]).join('')}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium">{applicant.name}</p>
                                                        <p className="text-xs text-muted-foreground">{applicant.email}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="text-right hidden sm:block">
                                                        <p className="text-xs font-medium text-primary">{applicant.matchScore}% Match</p>
                                                        <p className="text-xs text-muted-foreground">Applied {applicant.appliedDate}</p>
                                                    </div>
                                                    <Badge variant="secondary" className="text-xs">
                                                        {applicant.status}
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-8 text-muted-foreground text-sm">
                                            No applicants yet for this position.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Create New Job</DialogTitle>
                        <DialogDescription>
                            Enter the details for the new job position.
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="flex-1 pr-4 -mr-4">
                        <div className="space-y-4 py-4 px-1">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Job Title *</label>
                                <input
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="e.g. Senior Frontend Engineer"
                                    value={newJobTitle}
                                    onChange={(e) => setNewJobTitle(e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Location</label>
                                    <input
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        placeholder="e.g. New York, NY"
                                        value={newJobLocation}
                                        onChange={(e) => setNewJobLocation(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Employment Type</label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={newJobType}
                                        onChange={(e) => setNewJobType(e.target.value)}
                                    >
                                        <option value="Full-time">Full-time</option>
                                        <option value="Part-time">Part-time</option>
                                        <option value="Contract">Contract</option>
                                        <option value="Internship">Internship</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Salary Range</label>
                                    <input
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        placeholder="e.g. $120k - $150k"
                                        value={newJobSalary}
                                        onChange={(e) => setNewJobSalary(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Max Applicants (Optional)</label>
                                    <input
                                        type="number"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        placeholder="e.g. 100"
                                        value={newJobMaxApplicants}
                                        onChange={(e) => setNewJobMaxApplicants(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Description *</label>
                                <textarea
                                    className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="Describe the role responsibilities and expectations..."
                                    value={newJobDescription}
                                    onChange={(e) => setNewJobDescription(e.target.value)}
                                />
                            </div>
                        </div>
                    </ScrollArea>
                    <div className="flex justify-end gap-3 pt-4 border-t mt-2">
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button variant="secondary" onClick={() => handleCreateJob('draft')} disabled={isSubmitting}>
                            Save Draft
                        </Button>
                        <Button onClick={() => handleCreateJob('active')} disabled={isSubmitting}>
                            Publish
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
