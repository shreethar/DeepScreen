"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, Clock } from "lucide-react"
import { collection, getDocs, Timestamp, query, where, doc, updateDoc } from "firebase/firestore"
import { onAuthStateChanged } from "firebase/auth"
import { auth, db } from "@/lib/firebase"

interface Job {
    id: string
    title: string
    description?: string
    status: string
    createdAt: Timestamp
    // Add other fields as needed
}

export default function ApplicantJobsPage() {
    const [jobs, setJobs] = useState<Job[]>([])
    const [loading, setLoading] = useState(true)
    const [user, setUser] = useState<any>(null)
    const [applicationsMap, setApplicationsMap] = useState<Record<string, { id: string, status: string }>>({})

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser)
        })
        return () => unsubscribe()
    }, [])

    useEffect(() => {
        const fetchAppliedJobs = async () => {
            if (!user) {
                setApplicationsMap({})
                return
            }
            try {
                const q = query(collection(db, "applications"), where("applicantId", "==", user.uid))
                const querySnapshot = await getDocs(q)
                const map: Record<string, { id: string, status: string }> = {}
                querySnapshot.docs.forEach(doc => {
                    const data = doc.data()
                    map[data.jobId] = { id: doc.id, status: data.pipelineState }
                })
                setApplicationsMap(map)
            } catch (error) {
                console.error("Error fetching applications:", error)
            }
        }

        fetchAppliedJobs()
    }, [user])

    useEffect(() => {
        const fetchJobs = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, "jobs"))
                const jobsData = querySnapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Job[]
                setJobs(jobsData)
            } catch (error) {
                console.error("Error fetching jobs:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchJobs()
    }, [])

    const getDaysOpen = (createdAt: Timestamp) => {
        if (!createdAt) return 0
        const now = new Date()
        const postedDate = createdAt.toDate()
        const diffTime = Math.abs(now.getTime() - postedDate.getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        return diffDays
    }

    const handleAcceptOffer = async (applicationId: string, jobId: string) => {
        try {
            await updateDoc(doc(db, "applications", applicationId), {
                pipelineState: "hired"
            })
            // Update local state
            setApplicationsMap(prev => ({
                ...prev,
                [jobId]: { ...prev[jobId], status: "hired" }
            }))
        } catch (error) {
            console.error("Error accepting offer:", error)
        }
    }

    const handleDeclineOffer = async (applicationId: string, jobId: string) => {
        if (!confirm("Are you sure you want to decline this offer?")) return
        try {
            await updateDoc(doc(db, "applications", applicationId), {
                pipelineState: "offer_declined"
            })
            // Update local state
            setApplicationsMap(prev => ({
                ...prev,
                [jobId]: { ...prev[jobId], status: "offer_declined" }
            }))
        } catch (error) {
            console.error("Error declining offer:", error)
        }
    }

    if (loading) {
        return <div>Loading jobs...</div>
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-foreground">Open Positions</h1>
                    <p className="text-muted-foreground">Find and apply for your next role</p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {jobs.map((job) => (
                    <Card key={job.id} className="border-border bg-card hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                                <div>
                                    <CardTitle className="text-base text-foreground">{job.title}</CardTitle>
                                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                                        {job.description || "No description available"}
                                    </p>
                                </div>
                                <Badge
                                    variant="outline"
                                    className="bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30 uppercase"
                                >
                                    {job.status}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1.5">
                                    <Clock className="h-4 w-4" />
                                    Posted {getDaysOpen(job.createdAt)} days ago
                                </span>
                            </div>
                            <div className="mt-4 pt-4 border-t border-border">
                                {applicationsMap[job.id] ? (
                                    applicationsMap[job.id].status === 'offer_sent' ? (
                                        <div className="space-y-2">
                                            <div className="p-2 bg-green-500/10 border border-green-500/20 rounded-md text-center">
                                                <p className="text-sm font-medium text-green-600">Offer Received!</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white shadow-sm h-8 text-xs"
                                                    onClick={() => handleAcceptOffer(applicationsMap[job.id].id, job.id)}
                                                >
                                                    Accept
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300 h-8 text-xs shadow-none"
                                                    onClick={() => handleDeclineOffer(applicationsMap[job.id].id, job.id)}
                                                >
                                                    Decline
                                                </Button>
                                            </div>
                                        </div>
                                    ) : applicationsMap[job.id].status === 'hired' ? (
                                        <Button className="w-full bg-green-500/10 text-green-600 border border-green-500/20 cursor-default hover:bg-green-500/10 shadow-none font-medium">
                                            Offer Accepted
                                        </Button>
                                    ) : applicationsMap[job.id].status === 'offer_declined' ? (
                                        <Button className="w-full bg-red-500/10 text-red-600 border border-red-500/20 cursor-default hover:bg-red-500/10 shadow-none font-medium">
                                            Offer Declined
                                        </Button>
                                    ) : (
                                        <Button className="w-full bg-muted text-muted-foreground cursor-not-allowed hover:bg-muted shadow-none" disabled>
                                            Already Applied
                                        </Button>
                                    )
                                ) : (
                                    <Button asChild className="w-full bg-primary/10 text-primary hover:bg-primary/20 border-0 shadow-none">
                                        <Link href={`/applicant/jobs/${job.id}/apply`}>Apply Now</Link>
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
