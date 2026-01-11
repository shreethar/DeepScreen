"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, Clock } from "lucide-react"
import { collection, getDocs, Timestamp, query, where } from "firebase/firestore"
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
    const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set())

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser)
        })
        return () => unsubscribe()
    }, [])

    useEffect(() => {
        const fetchAppliedJobs = async () => {
            if (!user) {
                setAppliedJobIds(new Set())
                return
            }
            try {
                const q = query(collection(db, "applications"), where("applicantId", "==", user.uid))
                const querySnapshot = await getDocs(q)
                const ids = new Set(querySnapshot.docs.map(doc => doc.data().jobId))
                setAppliedJobIds(ids)
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
                                {appliedJobIds.has(job.id) ? (
                                    <Button className="w-full bg-muted text-muted-foreground cursor-not-allowed hover:bg-muted shadow-none" disabled>
                                        Already Applied
                                    </Button>
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
