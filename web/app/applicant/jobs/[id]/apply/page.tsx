"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { FileText, Video as VideoIcon, CheckCircle2, Users, Clock } from "lucide-react"
import { toast } from "sonner"
import { doc, getDoc, Timestamp, addDoc, collection, query, where, getDocs, updateDoc, increment } from "firebase/firestore"
import { onAuthStateChanged } from "firebase/auth"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { auth, db, storage } from "@/lib/firebase"

interface Job {
    id: string
    title: string
    description?: string
    status: string
    createdAt: Timestamp
    applicantCount?: number
    maxApplicant?: number
    // Add other fields as needed
}

export default function ApplicantApplyPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [resumeFile, setResumeFile] = useState<File | null>(null)
    const [videoFile, setVideoFile] = useState<File | null>(null)
    const [job, setJob] = useState<Job | null>(null)
    const [loading, setLoading] = useState(true)
    const [user, setUser] = useState<any>(null)
    const [hasApplied, setHasApplied] = useState(false)

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser)
        })
        return () => unsubscribe()
    }, [])

    // Check for existing application
    useEffect(() => {
        const checkApplicationStatus = async () => {
            if (!user || !id) return

            try {
                const q = query(
                    collection(db, "applications"),
                    where("jobId", "==", id),
                    where("applicantId", "==", user.uid)
                )
                const querySnapshot = await getDocs(q)
                if (!querySnapshot.empty) {
                    setHasApplied(true)
                }
            } catch (error) {
                console.error("Error checking application status:", error)
            }
        }

        checkApplicationStatus()
    }, [user, id])

    useEffect(() => {
        const fetchJob = async () => {
            try {
                const docRef = doc(db, "jobs", id)
                const docSnap = await getDoc(docRef)

                if (docSnap.exists()) {
                    setJob({ id: docSnap.id, ...docSnap.data() } as Job)
                } else {
                    toast.error("Job not found")
                    router.push("/applicant/jobs")
                }
            } catch (error) {
                console.error("Error fetching job:", error)
                toast.error("Failed to load job details")
            } finally {
                setLoading(false)
            }
        }

        fetchJob()
    }, [id, router])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) {
            toast.error("You must be logged in to apply")
            return
        }

        if (!resumeFile || !videoFile || !job) {
            toast.error("Please upload both resume and video")
            return
        }

        setIsSubmitting(true)

        try {
            // 1. Upload Resume
            // Naming convention: pdfs/{userId}_{jobId}_{fileName}
            const resumeRef = ref(storage, `pdfs/${user.uid}_${job.id}_${resumeFile.name}`)
            const resumeSnapshot = await uploadBytes(resumeRef, resumeFile)
            const resumeUrl = await getDownloadURL(resumeSnapshot.ref)

            // 2. Upload Video
            // Naming convention: visume/{userId}_{jobId}_{fileName}
            const videoRef = ref(storage, `visume/${user.uid}_${job.id}_${videoFile.name}`)
            const videoSnapshot = await uploadBytes(videoRef, videoFile)
            const visumeUrl = await getDownloadURL(videoSnapshot.ref)

            // 3. Create Application Document
            const applicationData = {
                jobId: job.id,
                applicantId: user.uid,
                applicantName: user.displayName || "Applicant",
                applicantEmail: user.email,
                applicantPhone: user.phoneNumber || "",
                resumeUrl: resumeUrl,
                visumeUrl: visumeUrl,

                pipelineState: "submitted", // submitted → filtered → semantic_scored → llm_ranked

                layer1: {
                    qualified: true,
                    reasons: []
                },

                layer2: {
                    semanticScore: 0,
                    semanticRank: 0
                },

                layer3: {
                    llmScore: null,
                    finalRank: null,
                    explanation: null
                },

                submittedAt: Timestamp.now()
            }

            await addDoc(collection(db, "applications"), applicationData)

            // Increment applicant count for the job
            const jobRef = doc(db, "jobs", job.id)
            await updateDoc(jobRef, {
                applicantCount: increment(1)
            })

            toast.success("Application submitted successfully!", {
                description: "We have received your resume and video introduction.",
            })

            setIsSubmitting(false)
            router.push("/applicant/jobs")

        } catch (error: any) {
            console.error("Error submitting application:", error)
            toast.error("Failed to submit application", {
                description: error.message
            })
            setIsSubmitting(false)
        }
    }

    const getDaysOpen = (createdAt: Timestamp) => {
        if (!createdAt) return 0
        const now = new Date()
        const postedDate = createdAt.toDate()
        const diffTime = Math.abs(now.getTime() - postedDate.getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        return diffDays
    }

    if (loading) {
        return <div className="flex justify-center p-8">Loading job details...</div>
    }

    if (!job) {
        return <div className="flex justify-center p-8">Job not found</div>
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Job Details Section */}
            <div>
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">{job.title}</h1>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                            <span className="flex items-center gap-1.5">
                                <Clock className="h-4 w-4" />
                                posted {getDaysOpen(job.createdAt)} days ago
                            </span>
                            {(job.applicantCount !== undefined && job.maxApplicant !== undefined) && (
                                <span className="flex items-center gap-1.5">
                                    <Users className="h-4 w-4" />
                                    {job.applicantCount} / {job.maxApplicant} Applicants
                                </span>
                            )}
                        </div>
                    </div>
                    <Badge
                        variant="outline"
                        className="bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30 uppercase"
                    >
                        {job.status}
                    </Badge>
                </div>

                <Card className="border-border bg-card mb-8">
                    <CardHeader>
                        <CardTitle className="text-lg">Job Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground whitespace-pre-line">
                            {job.description || "No description provided."}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="border-t border-border pt-6">
                <h2 className="text-2xl font-bold tracking-tight text-foreground mb-4">Apply for Position</h2>
                <p className="text-muted-foreground mb-6">
                    Upload your resume and a short video introduction to apply.
                </p>

                <Card className="border-border bg-card">
                    <CardHeader>
                        <CardTitle>Application Details</CardTitle>
                        <CardDescription>Your contact information is automatically pulled from your profile.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {hasApplied ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
                                <div className="h-16 w-16 bg-[#10B981]/10 rounded-full flex items-center justify-center">
                                    <CheckCircle2 className="h-8 w-8 text-[#10B981]" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold text-foreground">Application Submitted</h3>
                                    <p className="text-muted-foreground mt-1 max-w-sm mx-auto">
                                        You have already applied for this position. We will review your application and get back to you soon.
                                    </p>
                                </div>
                                <Button variant="outline" onClick={() => router.push("/applicant/jobs")} className="mt-4">
                                    Browse More Jobs
                                </Button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* User Info Display */}
                                <div className="bg-muted/30 p-4 rounded-lg border border-border">
                                    <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">Applying as</h3>
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                            {user?.displayName?.charAt(0) || user?.email?.charAt(0) || "A"}
                                        </div>
                                        <div>
                                            <p className="font-medium text-foreground">{user?.displayName || "Applicant"}</p>
                                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                                <span>{user?.email}</span>
                                                {user?.phoneNumber && <span>• {user.phoneNumber}</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-2">
                                    <Label>Documents & Video</Label>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        {/* Resume Upload */}
                                        <div className={`
                            border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors
                            ${resumeFile ? "border-primary/50 bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"}
                        `}>
                                            <input
                                                type="file"
                                                id="resume"
                                                className="hidden"
                                                accept=".pdf,.doc,.docx"
                                                onChange={(e) => e.target.files?.[0] && setResumeFile(e.target.files[0])}
                                            />
                                            <Label htmlFor="resume" className="cursor-pointer w-full h-full flex flex-col items-center justify-center">
                                                {resumeFile ? (
                                                    <>
                                                        <CheckCircle2 className="h-8 w-8 text-primary mb-2" />
                                                        <span className="font-medium text-sm text-foreground">{resumeFile.name}</span>
                                                        <span className="text-xs text-muted-foreground mt-1">{(resumeFile.size / 1024 / 1024).toFixed(2)} MB</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                                                        <span className="font-medium text-sm text-foreground">Upload Resume</span>
                                                        <span className="text-xs text-muted-foreground mt-1">PDF or Word (Max 5MB)</span>
                                                    </>
                                                )}
                                            </Label>
                                        </div>

                                        {/* Video Upload */}
                                        <div className={`
                            border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors
                            ${videoFile ? "border-primary/50 bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"}
                        `}>
                                            <input
                                                type="file"
                                                id="video"
                                                className="hidden"
                                                accept="video/*"
                                                onChange={(e) => e.target.files?.[0] && setVideoFile(e.target.files[0])}
                                            />
                                            <Label htmlFor="video" className="cursor-pointer w-full h-full flex flex-col items-center justify-center">
                                                {videoFile ? (
                                                    <>
                                                        <CheckCircle2 className="h-8 w-8 text-primary mb-2" />
                                                        <span className="font-medium text-sm text-foreground">{videoFile.name}</span>
                                                        <span className="text-xs text-muted-foreground mt-1">{(videoFile.size / 1024 / 1024).toFixed(2)} MB</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <VideoIcon className="h-8 w-8 text-muted-foreground mb-2" />
                                                        <span className="font-medium text-sm text-foreground">Upload Video</span>
                                                        <span className="text-xs text-muted-foreground mt-1">1-2 min intro (Max 50MB)</span>
                                                    </>
                                                )}
                                            </Label>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end gap-3">
                                    <Button type="button" variant="outline" onClick={() => router.back()}>
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="bg-[#3B82F6] hover:bg-[#2563EB] text-white"
                                        disabled={isSubmitting || !resumeFile || !videoFile}
                                    >
                                        {isSubmitting ? "Submitting..." : "Submit Application"}
                                    </Button>
                                </div>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
