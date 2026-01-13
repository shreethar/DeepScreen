"use client"

import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { mockCandidates, Candidate } from "@/lib/mock-data"
import { Search, Filter, ChevronRight, Play, Loader2, CheckCircle2, Globe, Trophy, Briefcase, Mail, Phone, FileText, Video, ExternalLink, CheckCircle, XCircle, User, AlertTriangle, GraduationCap, Award, Calendar, Code } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"


function getScoreColor(score: number) {
    if (score >= 85) return { bg: "bg-[#10B981]/10", text: "text-[#10B981]", border: "border-[#10B981]/30" }
    if (score >= 70) return { bg: "bg-[#F59E0B]/10", text: "text-[#F59E0B]", border: "border-[#F59E0B]/30" }
    return { bg: "bg-[#EF4444]/10", text: "text-[#EF4444]", border: "border-[#EF4444]/30" }
}

function getStatusConfig(status: string) {
    const configs: Record<string, { color: string; label: string }> = {
        pending: { color: "#F59E0B", label: "Pending" },
        reviewed: { color: "#3B82F6", label: "Reviewed" },
        shortlisted: { color: "#10B981", label: "Shortlisted" },
        rejected: { color: "#EF4444", label: "Rejected" },
    }
    return configs[status] || configs.pending
}

function HRCandidatesContent() {
    const searchParams = useSearchParams()
    const roleFilter = searchParams.get('role')
    const searchQuery = searchParams.get('search')

    // State for candidates and loading
    const [candidates, setCandidates] = useState<Candidate[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)
    const [isScoring, setIsScoring] = useState(false)
    const [isReranking, setIsReranking] = useState(false)
    const [isVideoAnalyzing, setIsVideoAnalyzing] = useState(false)
    const [isAnalyzing, setIsAnalyzing] = useState(false) // Deprecated but modifying to prevent break if referenced elsewhere momentarily
    const [jobDescription, setJobDescription] = useState<string>("")
    const [showVideo, setShowVideo] = useState(false)
    const [isPortfolioAnalyzing, setIsPortfolioAnalyzing] = useState(false)

    const canRerank = candidates.some(c => c.overallScore > 0)

    // Fetch Candidates from Firestore
    useEffect(() => {
        const fetchCandidates = async () => {
            setLoading(true)
            try {
                let appQuery
                let jobTitleMap: Record<string, string> = {}
                let currentJobDesc = ""

                // 1. Fetch Jobs to Create ID->Title Map (and filter if needed)
                let jobsQuery = collection(db, "jobs")
                // If filtering by role (title), we need to find the specific job ID first
                if (roleFilter) {
                    const roleQuery = query(collection(db, "jobs"), where("title", "==", roleFilter))
                    const roleSnapshot = await getDocs(roleQuery)
                    if (roleSnapshot.empty) {
                        setCandidates([])
                        setLoading(false)
                        return
                    }
                    // Assuming titles are unique or we just take the first match
                    const jobDoc = roleSnapshot.docs[0]
                    const targetJobId = jobDoc.id
                    jobTitleMap[targetJobId] = jobDoc.data().title
                    currentJobDesc = jobDoc.data().description || ""

                    appQuery = query(collection(db, "applications"), where("jobId", "==", targetJobId))
                } else {
                    // Fetch all jobs to map IDs to titles for display
                    const jobsSnapshot = await getDocs(collection(db, "jobs"))
                    jobsSnapshot.forEach(doc => {
                        jobTitleMap[doc.id] = doc.data().title
                    })
                    // If searching, fetch all and filter in memory (Firestore limited regex search)
                    // Or if no filter, fetch all
                    appQuery = collection(db, "applications")
                }

                setJobDescription(currentJobDesc)

                // 2. Fetch Applications
                const appSnapshot = await getDocs(appQuery)

                // 3. Map Firestore Data to Candidate Interface
                const fetchedCandidates: Candidate[] = appSnapshot.docs.map(doc => {
                    const data = doc.data()
                    console.log(`[DEBUG] Candidate ${data.applicantName} Layer3:`, data.layer3)
                    if (data.layer3?.videoAnalysis) {
                        console.log(`[DEBUG] Video Analysis Data:`, data.layer3.videoAnalysis)
                    }
                    return {
                        id: doc.id,
                        name: data.applicantName || "Unknown Applicant",
                        role: jobTitleMap[data.jobId] || "Unknown Role",
                        email: data.applicantEmail || "",
                        phone: data.applicantPhone || "",
                        overallScore: data.layer2?.semanticScore ? Math.round(data.layer2.semanticScore * 100) : 0,
                        status: (data.pipelineState === 'submitted' ? 'pending' : data.pipelineState) as any,
                        // Default/Placeholder values for missing fields to match Interface
                        location: "Remote",
                        appliedDate: data.submittedAt ? data.submittedAt.toDate().toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                        resumeUrl: data.resumeUrl,
                        videoUrl: data.visumeUrl,
                        topics: [],

                        // Analysis Status Maps
                        videoAnalysisStatus: data.layer3?.videoScore ? 'completed' : 'pending',
                        scraperStatus: data.layer3?.integrityScore ? 'completed' : 'pending',

                        // Nested Objects (Defaults if missing)
                        education: [],
                        experience: [],

                        resumeAnalysis: {
                            skillsFound: data.layer2?.extractedData?.skills || [],
                            experienceYears: Array.isArray(data.layer2?.extractedData?.experience)
                                ? data.layer2.extractedData.experience.reduce((acc: number, curr: any) => acc + (Number(curr.duration) || 0), 0)
                                : 0,
                            educationMatch: Array.isArray(data.layer2?.extractedData?.education) && data.layer2.extractedData.education.length > 0
                                ? data.layer2.extractedData.education.map((e: any) => `${e.degree} - ${e.course} \n(${e.year})`).join("\n\n")
                                : 0,
                            keywordMatch: data.layer2?.semanticScore ? Math.round(data.layer2.semanticScore * 100) : 0,
                            skillSimilarity: data.layer2?.breakdown?.semantic?.skill_similarity
                                ? Math.round(data.layer2.breakdown.semantic.skill_similarity * 100)
                                : (data.layer2?.semanticScore ? Math.round(data.layer2.semanticScore * 100) : 0),
                            descriptionFocus: data.layer2?.breakdown?.semantic?.description_focus_similarity
                                ? Math.round(data.layer2.breakdown.semantic.description_focus_similarity * 100)
                                : (data.layer2?.semanticScore ? Math.round(data.layer2.semanticScore * 100) : 0),
                            extractedData: {
                                ...data.layer2?.extractedData,
                                portfolio_url: data.layer2?.extractedData?.portfolio_url
                            }
                        },
                        videoAnalysis: {
                            overallConfidence: (data.layer3?.videoAnalysis?.data?.score ?? data.layer3?.videoScore)
                                ? ((data.layer3?.videoAnalysis?.data?.score ?? data.layer3?.videoScore) <= 1
                                    ? Math.round((data.layer3?.videoAnalysis?.data?.score ?? data.layer3?.videoScore) * 100)
                                    : (data.layer3?.videoAnalysis?.data?.score ?? data.layer3?.videoScore))
                                : 0,
                            duration: data.layer3?.videoAnalysis?.duration || "0:00",
                            transcription: data.layer3?.videoAnalysis?.data?.transcript || data.layer3?.videoAnalysis?.transcription || "",
                            sentimentData: data.layer3?.videoAnalysis?.sentimentData || [],
                            transcript: data.layer3?.videoAnalysis?.transcript || [],
                            details: {
                                ...data.layer3?.videoAnalysis?.details,
                                liveness: data.layer3?.videoAnalysis?.data?.liveness_status || data.layer3?.videoAnalysis?.details?.liveness,
                                speakingRate: data.layer3?.videoAnalysis?.data?.speaking_rate || data.layer3?.videoAnalysis?.data?.avg_speaking_rate_wpm || data.layer3?.videoAnalysis?.details?.speakingRate,
                                eyeContact: data.layer3?.videoAnalysis?.data?.eye_contact_score || data.layer3?.videoAnalysis?.data?.eye_contact_percentage || data.layer3?.videoAnalysis?.details?.eyeContact,
                                fillerCount: data.layer3?.videoAnalysis?.data?.filler_count || data.layer3?.videoAnalysis?.details?.fillerCount
                            }
                        },
                        portfolioAnalysis: data.layer3?.portfolioAnalysis,
                        integrityCheck: {
                            genAIProbability: 0,
                            portfolioValidation: []
                        },
                        scraperScore: 0
                    }
                })

                // Apply Text Search Filter (Client-side for now)
                const finalCandidates = searchQuery
                    ? fetchedCandidates.filter(c =>
                        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        c.email.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    : fetchedCandidates

                setCandidates(finalCandidates)

            } catch (error) {
                console.error("Error fetching candidates:", error)
                toast.error("Failed to load candidates")
            } finally {
                setLoading(false)
            }
        }

        fetchCandidates()
    }, [roleFilter, searchQuery])

    const scorePendingCandidates = async () => {
        if (!roleFilter || !jobDescription) {
            toast.error("Please filter by a specific role to run analysis.")
            return
        }

        setIsScoring(true)
        toast.info("Starting scoring pipeline...", {
            description: "Step 1: Batch scoring all candidates...",
        })

        try {
            // --- Step 1: Prepare all files ---
            const allFiles = new FormData()
            allFiles.append("job_description", `Title: ${roleFilter} Description: ${jobDescription}`)

            const fileMap = new Map<string, Blob>()
            let fileCount = 0

            for (const candidate of candidates) {
                if (candidate.resumeUrl) { // Logic could be improved to only score 'pending', but re-scoring all ensures consistency
                    try {
                        const response = await fetch(`/api/proxy?url=${encodeURIComponent(candidate.resumeUrl)}`)
                        if (!response.ok) throw new Error("Failed to fetch")
                        const blob = await response.blob()
                        const filename = `${candidate.id}__${candidate.name.replace(/\s+/g, '_')}_Resume.pdf`

                        allFiles.append("files", blob, filename)
                        fileMap.set(filename, blob)
                        fileCount++
                    } catch (err) {
                        console.error(`Failed to fetch resume for ${candidate.name}`, err)
                    }
                }
            }

            if (fileCount === 0) {
                toast.error("No resumes found to analyze.")
                setIsScoring(false)
                return
            }

            // --- Step 2: Batch Score All Candidates ---
            const scoreResponse = await fetch("http://127.0.0.1:8002/score-candidates/", {
                method: "POST",
                body: allFiles,
            })

            if (!scoreResponse.ok) throw new Error("Scoring API failed")
            const scoreResults = await scoreResponse.json()
            console.log("Scoring Results:", scoreResults)

            // --- Step 3: Update State with Scores ---
            const updatedCandidates = [...candidates]

            for (const result of scoreResults) {
                const candidateId = result.filename.split('__')[0]
                const candidateIndex = updatedCandidates.findIndex(c => c.id === candidateId)

                if (candidateIndex !== -1) {
                    const matchScore = Math.round(result.rank_score)

                    updatedCandidates[candidateIndex] = {
                        ...updatedCandidates[candidateIndex],
                        overallScore: matchScore,
                        resumeAnalysis: {
                            ...updatedCandidates[candidateIndex].resumeAnalysis,
                            skillsFound: result.extracted_data?.skills || [],
                            experienceYears: result.extracted_data?.experience_years ??
                                (Array.isArray(result.extracted_data?.experience)
                                    ? result.extracted_data.experience.reduce((acc: number, curr: any) => acc + (Number(curr.duration) || 0), 0)
                                    : 0),

                            educationMatch: Array.isArray(result.extracted_data?.education) && result.extracted_data.education.length > 0
                                ? result.extracted_data.education.map((e: any) => `${e.degree} - ${e.course} \n(${e.year})`).join("\n\n")
                                : "No education listed",

                            // Map breakdown fields
                            keywordMatch: Math.round(((result.breakdown?.semantic?.skill_similarity || 0) + (result.breakdown?.semantic?.description_focus_similarity || 0)) * 50),
                            skillSimilarity: Math.round((result.breakdown?.semantic?.skill_similarity || 0) * 100),
                            descriptionFocus: Math.round((result.breakdown?.semantic?.description_focus_similarity || 0) * 100),
                            extractedData: result.extracted_data ? {
                                ...result.extracted_data,
                                experience: Array.isArray(result.extracted_data.experience)
                                    ? result.extracted_data.experience.map((exp: any) => ({
                                        title: exp.title,
                                        duration: exp.duration,
                                        focus: exp.focus || exp.description || ""
                                    }))
                                    : []
                            } : undefined
                        },
                    } as any

                    // Update Firestore (optimistic)
                    const docRef = doc(db, "applications", candidateId)
                    const sanitizedExtractedData = result.extracted_data ? {
                        ...result.extracted_data,
                        experience: Array.isArray(result.extracted_data.experience)
                            ? result.extracted_data.experience.map((exp: any) => ({
                                title: exp.title || "Unknown Role",
                                duration: exp.duration || 0,
                                focus: exp.focus || exp.description || ""
                            }))
                            : []
                    } : null

                    updateDoc(docRef, {
                        "layer2.semanticScore": matchScore / 100,
                        "layer2.extractedData": sanitizedExtractedData,
                        "layer2.breakdown": result.breakdown || null
                    }).catch(e => console.error("Firestore update failed", e))
                }
            }

            // Sort by score (desc)
            updatedCandidates.sort((a, b) => b.overallScore - a.overallScore)

            setCandidates(updatedCandidates)
            toast.success("Scoring complete! Ready for reranking.")

        } catch (error) {
            console.error("Scoring Error:", error)
            toast.error("Scoring failed", { description: String(error) })
        } finally {
            setIsScoring(false)
        }
    }

    const rerankTopCandidates = async () => {
        if (!roleFilter || !jobDescription) {
            toast.error("Missing job context for reranking.")
            return
        }

        setIsReranking(true)
        const top8Candidates = [...candidates].sort((a, b) => b.overallScore - a.overallScore).slice(0, 8)

        if (top8Candidates.length === 0) {
            toast.warning("No candidates to rerank.")
            setIsReranking(false)
            return
        }

        toast.info("Refining top candidates...", {
            description: `Reranking top ${top8Candidates.length} profiles...`,
        })

        try {
            const rerankFiles = new FormData()
            rerankFiles.append("job_description", `Title: ${roleFilter} Description: ${jobDescription}`)

            // We need to re-fetch these files or rely on browser cache. 
            // Since we don't have the blobs in memory anymore (unless we state lifted them, which we didn't), we fetch again.
            // This is slightly inefficient but safer for stateless approach.

            let fileCount = 0
            for (const candidate of top8Candidates) {
                if (candidate.resumeUrl) {
                    try {
                        const response = await fetch(`/api/proxy?url=${encodeURIComponent(candidate.resumeUrl)}`)
                        if (!response.ok) throw new Error("Failed to fetch")
                        const blob = await response.blob()
                        const filename = `${candidate.id}__${candidate.name.replace(/\s+/g, '_')}_Resume.pdf`

                        rerankFiles.append("files", blob, filename)
                        fileCount++
                    } catch (err) {
                        console.error(`Skipping ${candidate.name} in rerank due to fetch error`)
                    }
                }
            }

            if (fileCount === 0) {
                toast.error("Failed to prepare files for reranking.")
                setIsReranking(false)
                return
            }

            // --- Call Rerank API ---
            const rerankResponse = await fetch("http://127.0.0.1:8002/rerank-candidates/", {
                method: "POST",
                body: rerankFiles,
            })

            if (!rerankResponse.ok) throw new Error("Reranking API failed")
            const rerankResults = await rerankResponse.json()
            console.log("Reranking Results:", rerankResults)

            // --- Update State with Ranks ---
            const updatedCandidates = [...candidates]

            for (const result of rerankResults) {
                const candidateId = result.filename.split('__')[0]
                const candidateIndex = updatedCandidates.findIndex(c => c.id === candidateId)

                if (candidateIndex !== -1) {
                    const apiStatus = result.status === 'QUALIFIED' ? 'shortlisted' : 'rejected'

                    updatedCandidates[candidateIndex] = {
                        ...updatedCandidates[candidateIndex],
                        status: apiStatus as any,
                        _tempRank: result.final_rank || 999
                    } as any

                    // Update Firestore 
                    const docRef = doc(db, "applications", candidateId)
                    updateDoc(docRef, {
                        pipelineState: apiStatus,
                        "layer2.reasoning": result.logic_reason || "",
                        "layer2.rank": result.final_rank || 999,
                    }).catch(e => console.error("Firestore update failed", e))
                }
            }

            // Sort by final rank (asc) then score (desc)
            updatedCandidates.sort((a: any, b: any) => {
                const rankA = a._tempRank ?? 999
                const rankB = b._tempRank ?? 999
                if (rankA !== rankB) return rankA - rankB
                return b.overallScore - a.overallScore
            })

            setCandidates(updatedCandidates)
            toast.success("Reranking complete!")

        } catch (error) {
            console.error("Reranking Error:", error)
            toast.error("Reranking failed", { description: String(error) })
        } finally {
            setIsReranking(false)
        }
    }

    // Analyze Video Handler
    const analyzeVideo = async (candidate: Candidate) => {
        if (!candidate.videoUrl) {
            toast.error("No video URL found for this candidate.")
            return
        }

        setIsVideoAnalyzing(true)
        toast.info("Analyzing video...", { description: "This may take a few moments." })

        try {
            // 1. Fetch the video blob
            const videoResponse = await fetch(`/api/proxy?url=${encodeURIComponent(candidate.videoUrl)}`)
            if (!videoResponse.ok) throw new Error("Failed to fetch video")
            const videoBlob = await videoResponse.blob()

            // 2. Create FormData
            const formData = new FormData()
            formData.append("file", videoBlob, "interview_video.mp4")

            // 3. Call Analysis API
            const response = await fetch("http://localhost:8001/analyze", {
                method: "POST",
                body: formData,
            })

            if (!response.ok) throw new Error("Analysis API failed")
            const rawResult = await response.json()

            // Map backend response to UI State Interface
            const mappedResult = {
                overallConfidence: rawResult.data.score || 0,
                duration: "0:00", // Backend doesn't return duration yet
                transcription: rawResult.data.transcript || "",
                sentimentData: [],
                transcript: [],
                details: {
                    liveness: rawResult.data.liveness_status,
                    speakingRate: rawResult.data.speaking_rate,
                    eyeContact: rawResult.data.eye_contact_score,
                    fillerCount: rawResult.data.filler_count,
                    blinkRate: rawResult.data.blink_rate_bpm,
                    smilePercentage: rawResult.data.smile_percentage,
                    stressPercentage: rawResult.data.stress_percentage,
                    headStability: rawResult.data.head_stability,
                    substance: rawResult.data.substance_details || null
                }
            }

            // 4. Update Candidate State
            const updatedCandidates = candidates.map(c => {
                if (c.id === candidate.id) {
                    return {
                        ...c,
                        videoAnalysis: mappedResult,
                        videoAnalysisStatus: 'completed'
                    } as any
                }
                return c
            })
            setCandidates(updatedCandidates)
            if (selectedCandidate?.id === candidate.id) {
                setSelectedCandidate({
                    ...selectedCandidate,
                    videoAnalysis: mappedResult,
                    videoAnalysisStatus: 'completed'
                } as any)
            }

            // 5. Update Firestore
            const docRef = doc(db, "applications", candidate.id)
            await updateDoc(docRef, {
                "layer3.videoScore": (mappedResult.overallConfidence / 100), // Normalize to 0-1
                "layer3.videoAnalysis": mappedResult
            })

            toast.success("Video analysis complete!")

        } catch (error) {
            console.error("Video analysis error:", error)
            toast.error("Failed to analyze video")
        } finally {
            setIsVideoAnalyzing(false)
        }
    }

    // Analyze Portfolio Handler
    const analyzePortfolio = async (candidate: Candidate) => {
        const extractedData = candidate.resumeAnalysis?.extractedData
        if (!extractedData) {
            toast.error("No extracted resume data found for this candidate.")
            setIsPortfolioAnalyzing(false)
            return
        }

        setIsPortfolioAnalyzing(true)
        toast.info("Auditing portfolio...", { description: "Running deep analysis on projects..." })

        // Construct strict payload matching the working example
        const sanitizedPayload = {
            summary: extractedData.summary || "",
            skills: extractedData.skills || [],
            portfolio_url: extractedData.portfolio_url || "",
            projects: extractedData.projects?.map(p => ({
                title: p.title || "Untitled Project",
                description: p.description || "",
                tech_stack: p.tech_stack || [],
                live_link: p.live_link || null,
                repo_link: p.repo_link || null
            })) || [],
            experience: extractedData.experience?.map(e => ({
                title: e.title,
                duration: typeof e.duration === 'string' ? parseFloat(e.duration) : (e.duration || 0),
                //description: e.focus || e.description || "" // Handle focus/description mapping
                description: e.focus || "" // Handle focus/description mapping
            })) || [],
            education: extractedData.education?.map(e => ({
                degree: e.degree,
                course: e.course,
                year: e.year
            })) || [],
            certifications: [] // Explicitly include empty array as per working example
        }

        try {
            console.log("Sending Sanitized Payload:", sanitizedPayload)

            // 3. Call Audit API with JSON payload
            const response = await fetch("http://localhost:8000/audit", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(sanitizedPayload),
            })

            if (!response.ok) {
                const errorData = await response.json()
                console.error("Audit API Error Details:", JSON.stringify(errorData, null, 2))
                const detail = errorData.detail?.[0]
                const errorMessage = detail ? `${detail.msg} (Field: ${detail.loc?.join(".")})` : response.statusText
                throw new Error(`Portfolio Audit API failed: ${errorMessage}`)
            }
            const result = await response.json()

            // 4. Update Candidate State
            const updatedCandidates = candidates.map(c => {
                if (c.id === candidate.id) {
                    return {
                        ...c,
                        portfolioAnalysis: result,
                        scraperStatus: 'completed'
                    } as any
                }
                return c
            })
            setCandidates(updatedCandidates)
            if (selectedCandidate?.id === candidate.id) {
                setSelectedCandidate({
                    ...selectedCandidate,
                    portfolioAnalysis: result,
                    scraperStatus: 'completed'
                } as any)
            }

            // 5. Update Firestore
            const docRef = doc(db, "applications", candidate.id)
            await updateDoc(docRef, {
                "layer3.portfolioAnalysis": result,
                "layer3.integrityScore": result.summary?.resume_verification_score ? result.summary.resume_verification_score / 100 : 0
            })

            toast.success("Portfolio audit complete!")

        } catch (error) {
            console.error("Portfolio audit error:", error)
            toast.error("Failed to audit portfolio")
        } finally {
            setIsPortfolioAnalyzing(false)
        }
    }


    return (
        <div className="space-y-6">
            {loading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-2xl font-semibold text-foreground">
                                {searchQuery
                                    ? `Search Results: "${searchQuery}"`
                                    : roleFilter
                                        ? `Candidates for ${roleFilter}`
                                        : "Candidates (HR View)"
                                }
                            </h1>
                            <p className="text-muted-foreground">{candidates.length} total candidates</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button
                                onClick={scorePendingCandidates}
                                disabled={isScoring}
                                className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                            >
                                {isScoring ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Scoring Pending...
                                    </>
                                ) : (
                                    <>
                                        <Play className="mr-2 h-4 w-4" />
                                        Score Pending
                                    </>
                                )}
                            </Button>

                            <Button
                                onClick={rerankTopCandidates}
                                disabled={isReranking || !canRerank}
                                className="bg-primary text-primary-foreground hover:bg-primary/90"
                            >
                                {isReranking ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Reranking...
                                    </>
                                ) : (
                                    <>
                                        <Trophy className="mr-2 h-4 w-4" />
                                        Rerank Top 8
                                    </>
                                )}
                            </Button>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input placeholder="Search candidates..." className="w-64 pl-9" />
                            </div>
                            <Button variant="outline" className="gap-2 bg-transparent">
                                <Filter className="h-4 w-4" />
                                Filter
                            </Button>
                        </div>
                    </div>

                    <Card className="border-border bg-card">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg text-foreground">All Candidates - Ranked by Semantic Similarity</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {candidates.map((candidate, index) => {
                                    const scoreColors = getScoreColor(candidate.overallScore)
                                    const statusConfig = getStatusConfig(candidate.status)

                                    return (
                                        <div
                                            key={candidate.id}
                                            onClick={() => setSelectedCandidate(candidate)}
                                            className="flex items-center gap-4 rounded-lg border border-border p-4 transition-colors hover:bg-muted/50 cursor-pointer"
                                        >
                                            <div className="flex-none flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground text-sm font-medium">
                                                #{index + 1}
                                            </div>

                                            <Avatar className="h-12 w-12">
                                                <AvatarFallback className="bg-[#3B82F6]/10 text-[#3B82F6] font-medium">
                                                    {candidate.name
                                                        .split(" ")
                                                        .map((n) => n[0])
                                                        .join("")}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-medium text-foreground">{candidate.name}</p>
                                                    <Badge
                                                        variant="outline"
                                                        className="text-xs"
                                                        style={{
                                                            backgroundColor: `${statusConfig.color}15`,
                                                            color: statusConfig.color,
                                                            borderColor: `${statusConfig.color}30`,
                                                        }}
                                                    >
                                                        {statusConfig.label}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-4 mt-1">
                                                    <p className="text-sm text-muted-foreground">{candidate.role}</p>

                                                    {/* Status Pillars */}
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full border",
                                                            candidate.videoAnalysisStatus === 'completed' ? "bg-green-500/10 text-green-500 border-green-500/20" :
                                                                candidate.videoAnalysisStatus === 'processing' ? "bg-blue-500/10 text-blue-500 border-blue-500/20 animate-pulse" : "bg-muted text-muted-foreground border-transparent"
                                                        )}>
                                                            <Play className="h-3 w-3" />
                                                            <span>Video</span>
                                                        </div>
                                                        <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full border",
                                                            candidate.scraperStatus === 'completed' ? "bg-purple-500/10 text-purple-500 border-purple-500/20" :
                                                                candidate.scraperStatus === 'processing' ? "bg-blue-500/10 text-blue-500 border-blue-500/20 animate-pulse" : "bg-muted text-muted-foreground border-transparent"
                                                        )}>
                                                            <Globe className="h-3 w-3" />
                                                            <span>Web</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <div className="text-xs text-muted-foreground mb-1">Match Score</div>
                                                    <Badge
                                                        variant="outline"
                                                        className={cn("font-semibold", scoreColors.bg, scoreColors.text, scoreColors.border)}
                                                    >
                                                        {candidate.overallScore}%
                                                    </Badge>
                                                </div>
                                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    <Dialog open={!!selectedCandidate} onOpenChange={(open) => !open && setSelectedCandidate(null)}>
                        <DialogContent className="w-[65vw] max-w-[1000px] sm:max-w-[65vw] h-[95vh] flex flex-col p-0 gap-0">
                            <DialogHeader className="p-6 pb-4 border-b border-border bg-muted/10">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-4">
                                        <Avatar className="h-16 w-16 border-2 border-background shadow-sm">
                                            <AvatarFallback className="bg-[#3B82F6]/10 text-[#3B82F6] text-xl font-semibold">
                                                {selectedCandidate?.name
                                                    .split(" ")
                                                    .map((n) => n[0])
                                                    .join("")}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <DialogTitle className="text-2xl font-bold">{selectedCandidate?.name}</DialogTitle>
                                            <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                                                <Briefcase className="h-4 w-4" />
                                                <span>{selectedCandidate?.role}</span>
                                            </div>
                                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                                <div className="flex items-center gap-1.5">
                                                    <Mail className="h-3.5 w-3.5" />
                                                    {selectedCandidate?.email}
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Phone className="h-3.5 w-3.5" />
                                                    {selectedCandidate?.phone}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                "px-3 py-1 text-sm font-medium",
                                                selectedCandidate && getStatusConfig(selectedCandidate.status).color === "#10B981" ? "bg-green-500/10 text-green-500 border-green-500/20" :
                                                    selectedCandidate && getStatusConfig(selectedCandidate.status).color === "#3B82F6" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                                                        "bg-muted text-muted-foreground"
                                            )}
                                        >
                                            {selectedCandidate && getStatusConfig(selectedCandidate.status).label}
                                        </Badge>
                                        {selectedCandidate && (
                                            <div className="text-right">
                                                <div className="text-xs text-muted-foreground mb-0.5">Match Score</div>
                                                <div className={cn("text-2xl font-bold", getScoreColor(selectedCandidate.overallScore).text)}>
                                                    {selectedCandidate.overallScore}%
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </DialogHeader>

                            {selectedCandidate && (
                                <div className="flex-1 overflow-hidden">
                                    <Tabs defaultValue="overview" className="h-full flex flex-col">
                                        <div className="px-6 py-4">
                                            <TabsList className="w-full grid grid-cols-3 h-12 bg-muted/40 p-1.5 rounded-xl gap-2">
                                                <TabsTrigger
                                                    value="overview"
                                                    className="rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all duration-200"
                                                >
                                                    Overview
                                                </TabsTrigger>
                                                <TabsTrigger
                                                    value="video"
                                                    className="rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all duration-200"
                                                >
                                                    Video Analysis
                                                </TabsTrigger>
                                                <TabsTrigger
                                                    value="portfolio"
                                                    className="rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all duration-200"
                                                >
                                                    Portfolio Analysis
                                                </TabsTrigger>
                                            </TabsList>
                                        </div>

                                        <div className="flex-1 overflow-y-auto">
                                            <div className="p-6">
                                                <TabsContent value="overview" className="m-0 space-y-8">

                                                    {/* Summary Section */}
                                                    {selectedCandidate.resumeAnalysis.extractedData?.summary && (
                                                        <section>
                                                            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                                                <FileText className="h-5 w-5 text-primary" />
                                                                Summary
                                                            </h3>
                                                            <div className="p-4 rounded-lg bg-muted/40 border border-border text-sm leading-relaxed text-foreground/90">
                                                                {selectedCandidate.resumeAnalysis.extractedData.summary}
                                                            </div>
                                                        </section>
                                                    )}

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
                                                                            {selectedCandidate.resumeAnalysis.skillSimilarity ?? 0}% Match
                                                                        </Badge>
                                                                    </div>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {(selectedCandidate.resumeAnalysis.extractedData?.skills || selectedCandidate.resumeAnalysis.skillsFound).map(skill => (
                                                                            <Badge key={skill} variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">
                                                                                {skill}
                                                                            </Badge>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <div className="flex justify-between text-sm mb-2">
                                                                        <span className="text-muted-foreground">Description Focus</span>
                                                                        <span className="font-medium">{selectedCandidate.resumeAnalysis.descriptionFocus ?? selectedCandidate.resumeAnalysis.keywordMatch}%</span>
                                                                    </div>
                                                                    <Progress value={selectedCandidate.resumeAnalysis.descriptionFocus ?? selectedCandidate.resumeAnalysis.keywordMatch} className="h-2" />
                                                                </div>
                                                            </div>
                                                            <div className="space-y-6">
                                                                <div className="grid grid-cols-1 gap-4">
                                                                    {/* Experience Section */}
                                                                    <div className="p-4 rounded-lg bg-muted/40 border border-border">
                                                                        <div className="text-sm text-muted-foreground mb-2">Experience</div>
                                                                        {selectedCandidate.resumeAnalysis.extractedData?.experience ? (
                                                                            <div className="space-y-3">
                                                                                {selectedCandidate.resumeAnalysis.extractedData.experience.map((exp, i) => (
                                                                                    <div key={i} className="text-sm border-l-2 border-primary/20 pl-3">
                                                                                        <div className="font-medium">{exp.title}</div>
                                                                                        <div className="text-muted-foreground text-xs">{exp.duration} Years</div>
                                                                                        <div className="text-xs text-muted-foreground/80 mt-1 line-clamp-2">{exp.focus}</div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        ) : (
                                                                            <div className="text-2xl font-bold">{selectedCandidate.resumeAnalysis.experienceYears} Years</div>
                                                                        )}
                                                                    </div>

                                                                    {/* Education Section */}
                                                                    <div className="p-4 rounded-lg bg-muted/40 border border-border">
                                                                        <div className="text-sm text-muted-foreground mb-2">Education</div>
                                                                        {selectedCandidate.resumeAnalysis.extractedData?.education ? (
                                                                            <div className="space-y-3">
                                                                                {selectedCandidate.resumeAnalysis.extractedData.education.map((edu, i) => (
                                                                                    <div key={i} className="text-sm">
                                                                                        <div className="font-medium">{edu.degree}</div>
                                                                                        <div className="text-xs text-muted-foreground">{edu.course} • {edu.year}</div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        ) : (
                                                                            <div className="text-sm font-medium whitespace-pre-wrap leading-relaxed text-foreground/90">
                                                                                {selectedCandidate.resumeAnalysis.educationMatch}
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
                                                        {/* Video Analysis */}
                                                        <div className="p-6 rounded-xl border border-border bg-card">
                                                            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                                                                <Video className="h-5 w-5 text-blue-500" />
                                                                Video Analysis
                                                            </h3>

                                                            {/* Analysis Results (Show First) */}
                                                            {(selectedCandidate.videoAnalysis as any)?.details ? (
                                                                <div className="space-y-4 mb-6">
                                                                    <div className="flex items-center justify-between p-4 rounded-lg bg-blue-500/5 border border-blue-500/10">
                                                                        <span className="text-sm font-medium text-blue-700">Interview Score</span>
                                                                        <span className="text-2xl font-bold text-blue-700">
                                                                            {selectedCandidate.videoAnalysis.overallConfidence}/100
                                                                        </span>
                                                                    </div>

                                                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                                                        {/* Row 1: Structure & Relevance */}
                                                                        <div className="p-3 bg-muted/30 rounded-lg">
                                                                            <div className="text-xs text-muted-foreground mb-1">Structure Score</div>
                                                                            <div className="font-medium">
                                                                                {(selectedCandidate.videoAnalysis as any).details.substance?.structure_score ?? "-"}/10
                                                                            </div>
                                                                        </div>
                                                                        <div className="p-3 bg-muted/30 rounded-lg">
                                                                            <div className="text-xs text-muted-foreground mb-1">Relevance Score</div>
                                                                            <div className="font-medium">
                                                                                {(selectedCandidate.videoAnalysis as any).details.substance?.relevance_score ?? "-"}/10
                                                                            </div>
                                                                        </div>

                                                                        {/* Row 2: Conciseness & Speaking Rate */}
                                                                        <div className="p-3 bg-muted/30 rounded-lg">
                                                                            <div className="text-xs text-muted-foreground mb-1">Conciseness Score</div>
                                                                            <div className="font-medium">
                                                                                {(selectedCandidate.videoAnalysis as any).details.substance?.conciseness_score ?? "-"}/10
                                                                            </div>
                                                                        </div>
                                                                        <div className="p-3 bg-muted/30 rounded-lg">
                                                                            <div className="text-xs text-muted-foreground mb-1">Speaking Rate</div>
                                                                            <div className="font-medium">
                                                                                {(selectedCandidate.videoAnalysis as any).details.speakingRate?.toFixed(0)} WPM
                                                                            </div>
                                                                        </div>

                                                                        {/* Row 3: Filler Count & Eye Contact */}
                                                                        <div className="p-3 bg-muted/30 rounded-lg">
                                                                            <div className="text-xs text-muted-foreground mb-1">Filler Count</div>
                                                                            <div className="font-medium">
                                                                                {(selectedCandidate.videoAnalysis as any).details.fillerCount ?? 0}
                                                                            </div>
                                                                        </div>
                                                                        <div className="p-3 bg-muted/30 rounded-lg">
                                                                            <div className="text-xs text-muted-foreground mb-1">Eye Contact</div>
                                                                            <div className="font-medium">
                                                                                {(selectedCandidate.videoAnalysis as any).details.eyeContact?.toFixed(0)}%
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    <div className="text-xs text-muted-foreground">
                                                                        <strong className="block mb-1 text-foreground">Transcript Snippet:</strong>
                                                                        "{(selectedCandidate.videoAnalysis as any).transcription?.slice(0, 150)}..."
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="text-center text-sm text-muted-foreground py-4 border-b border-border/50 mb-4">
                                                                    Click "Analyze Video" to generate AI insights on communication skills and body language.
                                                                </div>
                                                            )}

                                                            <div className="space-y-6">
                                                                <div className="flex flex-col gap-4">
                                                                    {selectedCandidate.videoUrl ? (
                                                                        showVideo ? (
                                                                            <div className="relative w-full rounded-lg overflow-hidden bg-black/10 border border-border flex justify-center bg-black">
                                                                                {/* Simple video player with constrained height instead of aspect ratio */}
                                                                                <video controls className="max-h-[500px] w-auto h-auto object-contain mx-auto" autoPlay>
                                                                                    <source src={`/api/proxy?url=${encodeURIComponent(selectedCandidate.videoUrl)}`} type="video/mp4" />
                                                                                    Your browser does not support the video tag.
                                                                                </video>
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    className="absolute top-2 right-2 text-white hover:bg-white/20"
                                                                                    onClick={() => setShowVideo(false)}
                                                                                >
                                                                                    Close
                                                                                </Button>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="w-full h-48 bg-muted/30 rounded-lg border border-dashed border-border flex flex-col items-center justify-center gap-3">
                                                                                <Video className="h-8 w-8 text-muted-foreground/50" />
                                                                                <Button variant="outline" onClick={() => setShowVideo(true)}>
                                                                                    Watch Video
                                                                                </Button>
                                                                            </div>
                                                                        )
                                                                    ) : (
                                                                        <div className="flex items-center justify-center h-32 bg-muted/30 rounded-lg text-muted-foreground">
                                                                            No video submitted
                                                                        </div>
                                                                    )}

                                                                    <Button
                                                                        onClick={() => analyzeVideo(selectedCandidate)}
                                                                        disabled={isVideoAnalyzing || !selectedCandidate.videoUrl}
                                                                        variant="default" // Changed to default for better visibility
                                                                        className="w-full gap-2"
                                                                    >
                                                                        {isVideoAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                                                                        {selectedCandidate.videoAnalysis?.overallConfidence > 0 ? "Re-Analyze Video" : "Analyze Video"}
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TabsContent>

                                                <TabsContent value="portfolio" className="m-0 space-y-6">
                                                    <div className="grid gap-4">
                                                        {/* Portfolio Analysis */}
                                                        <div className="p-6 rounded-xl border border-border bg-card">
                                                            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                                                                <Globe className="h-5 w-5 text-purple-500" />
                                                                Portfolio Analysis
                                                            </h3>
                                                            <div className="space-y-6">
                                                                {!selectedCandidate.portfolioAnalysis ? (
                                                                    <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg border border-dashed border-border bg-muted/10">
                                                                        <Globe className="h-12 w-12 text-muted-foreground/50 mb-4" />
                                                                        <h3 className="text-lg font-semibold mb-2">Portfolio Not Analyzed</h3>
                                                                        <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                                                                            Run a deep audit on this candidate's portfolio to check deployment status, code quality, and resume verification.
                                                                        </p>
                                                                        <Button
                                                                            onClick={() => analyzePortfolio(selectedCandidate)}
                                                                            disabled={isPortfolioAnalyzing}
                                                                            className="bg-purple-600 hover:bg-purple-700 text-white"
                                                                        >
                                                                            {isPortfolioAnalyzing ? (
                                                                                <>
                                                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                                                    Auditing...
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <Play className="mr-2 h-4 w-4" />
                                                                                    Analyze Portfolio
                                                                                </>
                                                                            )}
                                                                        </Button>
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        {/* Summary Cards */}
                                                                        <div className="grid grid-cols-3 gap-4">
                                                                            <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/10 text-center">
                                                                                <div className="text-xs font-medium text-blue-600 mb-1 uppercase tracking-wider">Product Score</div>
                                                                                <div className="text-2xl font-bold text-blue-700">{selectedCandidate.portfolioAnalysis.summary.portfolio_product_score.toFixed(1)}</div>
                                                                            </div>
                                                                            <div className="p-4 rounded-lg bg-purple-500/5 border border-purple-500/10 text-center">
                                                                                <div className="text-xs font-medium text-purple-600 mb-1 uppercase tracking-wider">GitHub Quality</div>
                                                                                <div className="text-2xl font-bold text-purple-700">{selectedCandidate.portfolioAnalysis.summary.github_code_quality.toFixed(1)}</div>
                                                                            </div>
                                                                            <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/10 text-center">
                                                                                <div className="text-xs font-medium text-green-600 mb-1 uppercase tracking-wider">Verification</div>
                                                                                <div className="text-2xl font-bold text-green-700">{selectedCandidate.portfolioAnalysis.summary.resume_verification_score.toFixed(0)}%</div>
                                                                            </div>
                                                                        </div>

                                                                        {/* Detailed Audit Results */}
                                                                        <div>
                                                                            <h4 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                                                                                <Code className="h-4 w-4" />
                                                                                Detailed Project Audit
                                                                            </h4>
                                                                            <div className="space-y-4">
                                                                                {selectedCandidate.portfolioAnalysis.results.map((project, idx) => (
                                                                                    <div key={idx} className="rounded-lg border border-border bg-card overflow-hidden">
                                                                                        <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
                                                                                            <div className="font-semibold text-sm">{project.title}</div>
                                                                                            <div className="flex items-center gap-2">
                                                                                                {project.deployment.is_alive ? (
                                                                                                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px] gap-1">
                                                                                                        <CheckCircle className="h-3 w-3" /> Live
                                                                                                    </Badge>
                                                                                                ) : (
                                                                                                    <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 text-[10px] gap-1">
                                                                                                        <XCircle className="h-3 w-3" /> Dead ({project.deployment.status})
                                                                                                    </Badge>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                        <div className="p-4 space-y-4 text-sm">
                                                                                            {/* Deployment */}
                                                                                            {project.deployment.url && (
                                                                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                                                    <Globe className="h-3 w-3" />
                                                                                                    <a href={project.deployment.url} target="_blank" rel="noopener noreferrer" className="hover:underline text-primary truncate max-w-[300px]">{project.deployment.url}</a>
                                                                                                </div>
                                                                                            )}

                                                                                            {/* Code Quality */}
                                                                                            {project.code_quality.score !== "N/A" && (
                                                                                                <div className="bg-muted/30 p-3 rounded-md">
                                                                                                    <div className="flex items-center justify-between mb-2">
                                                                                                        <span className="font-medium text-xs">Code Quality</span>
                                                                                                        <Badge variant="secondary" className="text-[10px]">Score: {project.code_quality.score}</Badge>
                                                                                                    </div>
                                                                                                    <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                                                                                                        {project.code_quality.details.slice(0, 3).map((detail, i) => (
                                                                                                            <li key={i} className="line-clamp-1" title={detail}>{detail}</li>
                                                                                                        ))}
                                                                                                    </ul>
                                                                                                </div>
                                                                                            )}

                                                                                            {/* Verification */}
                                                                                            <div className="flex items-start gap-2 text-xs bg-amber-500/5 p-3 rounded-md border border-amber-500/10 text-amber-900">
                                                                                                <div className="font-medium whitespace-nowrap">Context Check:</div>
                                                                                                <div>{project.verification.reasoning || "Verified against resume description."}</div>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>

                                                            <div className="flex items-center gap-2 text-sm mt-4 p-2">
                                                                {selectedCandidate.resumeAnalysis.extractedData?.portfolio_url ? (
                                                                    <>
                                                                        <ExternalLink className="h-4 w-4 text-primary" />
                                                                        <a
                                                                            href={selectedCandidate.resumeAnalysis.extractedData.portfolio_url}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="text-primary hover:underline font-medium"
                                                                        >
                                                                            View Portfolio Source
                                                                        </a>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <XCircle className="h-4 w-4 text-muted-foreground" />
                                                                        <span className="text-muted-foreground">Portfolio URL not available</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                </TabsContent>
                                            </div>
                                        </div>
                                    </Tabs>
                                </div>
                            )}
                        </DialogContent>
                    </Dialog>
                </>
            )}
        </div>
    )
}

export default function HRCandidatesPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
            <HRCandidatesContent />
        </Suspense>
    )
}
