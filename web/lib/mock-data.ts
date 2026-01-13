export interface Candidate {
  id: string
  name: string
  email: string
  phone: string
  role: string
  appliedDate: string
  overallScore: number
  status: "pending" | "reviewed" | "shortlisted" | "rejected" | "screened" | "interviewed" | "offer_sent" | "hired" | "interview_scheduled"
  avatar?: string
  resumeUrl?: string
  videoUrl?: string
  videoAnalysisStatus: "pending" | "processing" | "completed"
  scraperStatus: "pending" | "processing" | "completed"
  videoScore?: number
  scraperScore?: number
  resumeAnalysis: {
    skillsFound: string[]
    skillsMissing?: string[]
    experienceYears: number
    educationMatch: string | number
    keywordMatch: number
    skillSimilarity?: number
    descriptionFocus?: number
    extractedData?: {
      summary?: string
      skills?: string[]
      experience?: {
        title: string
        duration: number
        focus: string
      }[]
      education?: {
        degree: string
        course: string
        year: string
      }[]
      portfolio_url?: string

      projects?: {
        title: string
        description: string
        tech_stack: string[]
        live_link?: string | null
        repo_link?: string | null
      }[]
    }
  }
  portfolioAnalysis?: {
    summary: {
      github_code_quality: number
      portfolio_product_score: number
      resume_verification_score: number
    }
    results: {
      title: string
      deployment: {
        is_alive: boolean
        status: number
        url?: string
      }
      code_quality: {
        score: number | "N/A"
        details: string[]
      }
      verification: {
        verdict: string
        reasoning?: string
      }
    }[]
  }
  videoAnalysis: {
    duration: string
    sentimentData: { time: string; confidence: number }[]
    transcript: { timestamp: string; text: string }[]
    overallConfidence: number
    transcription?: string
    details?: {
      speakingRate?: number
      eyeContact?: number
      headStability?: number
      liveness?: string
      pauseCount?: number
      fillerCount?: number
    }
  }
  integrityCheck: {
    genAIProbability: number
    portfolioValidation: {
      item: string
      status: "verified" | "warning" | "failed"
      detail: string
    }[]
  }
}

export const mockCandidates: Candidate[] = [
  {
    id: "1",
    name: "Shreethar Raventhar",
    email: "shree80537901@gmail.com",
    phone: "+60 123456789",
    role: "AI Engineer",
    appliedDate: "2024-01-15",
    overallScore: 92,
    status: "shortlisted",
    videoAnalysisStatus: "completed",
    scraperStatus: "completed",
    videoScore: 86,
    scraperScore: 90,
    resumeAnalysis: {
      skillsFound: ["React", "TypeScript", "Next.js", "Tailwind CSS", "GraphQL", "Node.js"],
      skillsMissing: ["Kubernetes", "AWS Lambda"],
      experienceYears: 6,
      educationMatch: 95,
      keywordMatch: 87,
      extractedData: {
        summary: "Experienced AI Engineer with a strong background in frontend development and a recent pivot to AI/ML.",
        skills: ["React", "TypeScript", "Next.js", "Tailwind CSS", "GraphQL", "Node.js", "Python", "TensorFlow"],
        experience: [
          {
            title: "Senior AI Engineer",
            duration: 3.5,
            focus: "Built LLM pipelines and deployed to production. Optimized inference latency by 40%."
          },
          {
            title: "Frontend Developer",
            duration: 2.5,
            focus: "Developed responsive web applications using React and TypeScript. Led UI revamp project."
          }
        ],
        education: [
          {
            degree: "Bachelor of Computer Science",
            course: "Artificial Intelligence",
            year: "2019"
          }
        ]
      }
    },
    videoAnalysis: {
      duration: "2:34",
      sentimentData: [
        { time: "0:00", confidence: 72 },
        { time: "0:15", confidence: 78 },
        { time: "0:30", confidence: 85 },
        { time: "0:45", confidence: 82 },
        { time: "1:00", confidence: 88 },
        { time: "1:15", confidence: 91 },
        { time: "1:30", confidence: 87 },
        { time: "1:45", confidence: 90 },
        { time: "2:00", confidence: 93 },
      ],
      transcript: [
        {
          timestamp: "0:00",
          text: "Hello, my name is Alex Chen and I'm excited to apply for the Senior Frontend Engineer position.",
        },
        {
          timestamp: "0:12",
          text: "I have over six years of experience building scalable web applications using React and TypeScript.",
        },
        {
          timestamp: "0:28",
          text: "At my current role, I led a team of five developers to rebuild our entire customer dashboard, resulting in a 40% improvement in page load times.",
        },
        {
          timestamp: "0:45",
          text: "I'm particularly passionate about creating accessible user interfaces and have implemented WCAG 2.1 compliance across multiple projects.",
        },
        {
          timestamp: "1:05",
          text: "One of my proudest achievements was developing a real-time collaboration feature that now serves over 100,000 daily active users.",
        },
        {
          timestamp: "1:25",
          text: "I'm drawn to your company because of its commitment to innovation and the opportunity to work on cutting-edge AI products.",
        },
        {
          timestamp: "1:45",
          text: "I believe my experience with performance optimization and team leadership would make me a valuable addition to your engineering team.",
        },
        {
          timestamp: "2:05",
          text: "Thank you for considering my application. I look forward to discussing how I can contribute to your success.",
        },
      ],
      overallConfidence: 86,
    },
    integrityCheck: {
      genAIProbability: 23,
      portfolioValidation: [
        {
          item: "GitHub Repository Analysis",
          status: "verified",
          detail: "5 active repos found, 847 contributions in past year",
        },
        { item: "LinkedIn Cross-check", status: "verified", detail: "Profile matches resume, 500+ connections" },
        { item: "Education Verification", status: "verified", detail: "Stanford University, BS Computer Science 2018" },
        {
          item: "Previous Employment",
          status: "warning",
          detail: "Title mismatch: Resume says 'Lead', LinkedIn says 'Senior'",
        },
        { item: "Portfolio Website", status: "verified", detail: "Active portfolio with 12 project showcases" },
      ],
    },
  },
  {
    id: "2",
    name: "Sarah Johnson",
    email: "sarah.j@email.com",
    phone: "+1 (555) 234-5678",
    role: "Product Designer",
    appliedDate: "2024-01-14",
    overallScore: 92,
    status: "shortlisted",
    videoAnalysisStatus: "completed",
    scraperStatus: "completed",
    videoScore: 92,
    scraperScore: 95,
    resumeAnalysis: {
      skillsFound: ["Figma", "Adobe XD", "User Research", "Prototyping", "Design Systems", "Usability Testing"],
      skillsMissing: ["Motion Design"],
      experienceYears: 5,
      educationMatch: 90,
      keywordMatch: 94,
    },
    videoAnalysis: {
      duration: "2:15",
      sentimentData: [
        { time: "0:00", confidence: 85 },
        { time: "0:15", confidence: 88 },
        { time: "0:30", confidence: 92 },
        { time: "0:45", confidence: 90 },
        { time: "1:00", confidence: 94 },
        { time: "1:15", confidence: 91 },
        { time: "1:30", confidence: 95 },
        { time: "1:45", confidence: 93 },
        { time: "2:00", confidence: 96 },
      ],
      transcript: [
        {
          timestamp: "0:00",
          text: "Hi, I'm Sarah Johnson, a product designer with five years of experience creating user-centered digital experiences.",
        },
        {
          timestamp: "0:15",
          text: "I specialize in building design systems that scale across large product portfolios.",
        },
      ],
      overallConfidence: 92,
    },
    integrityCheck: {
      genAIProbability: 12,
      portfolioValidation: [
        { item: "Dribbble Portfolio", status: "verified", detail: "Active profile with 2.3K followers" },
        { item: "LinkedIn Cross-check", status: "verified", detail: "Profile matches resume" },
        { item: "Education Verification", status: "verified", detail: "RISD, BFA Graphic Design 2019" },
        { item: "Previous Employment", status: "verified", detail: "All employment history verified" },
      ],
    },
  },
  {
    id: "3",
    name: "Marcus Williams",
    email: "m.williams@email.com",
    phone: "+1 (555) 345-6789",
    role: "Backend Engineer",
    appliedDate: "2024-01-13",
    overallScore: 75,
    status: "reviewed",
    videoAnalysisStatus: "completed",
    scraperStatus: "completed",
    videoScore: 71,
    scraperScore: 78,
    resumeAnalysis: {
      skillsFound: ["Python", "Django", "PostgreSQL", "Docker"],
      skillsMissing: ["Kubernetes", "AWS", "Microservices", "GraphQL"],
      experienceYears: 3,
      educationMatch: 80,
      keywordMatch: 68,
    },
    videoAnalysis: {
      duration: "1:58",
      sentimentData: [
        { time: "0:00", confidence: 65 },
        { time: "0:15", confidence: 68 },
        { time: "0:30", confidence: 70 },
        { time: "0:45", confidence: 72 },
        { time: "1:00", confidence: 69 },
        { time: "1:15", confidence: 74 },
        { time: "1:30", confidence: 71 },
        { time: "1:45", confidence: 76 },
      ],
      transcript: [
        { timestamp: "0:00", text: "Hello, I'm Marcus Williams, applying for the Backend Engineer position." },
        { timestamp: "0:12", text: "I have three years of experience working with Python and Django." },
      ],
      overallConfidence: 71,
    },
    integrityCheck: {
      genAIProbability: 67,
      portfolioValidation: [
        { item: "GitHub Repository Analysis", status: "warning", detail: "Only 2 repos, limited activity" },
        { item: "LinkedIn Cross-check", status: "verified", detail: "Profile matches resume" },
        { item: "Education Verification", status: "verified", detail: "UC Berkeley, BS Computer Science 2021" },
        { item: "Previous Employment", status: "warning", detail: "Unable to verify freelance work" },
      ],
    },
  },
  {
    id: "4",
    name: "Emily Rodriguez",
    email: "emily.r@email.com",
    phone: "+1 (555) 456-7890",
    role: "Data Scientist",
    appliedDate: "2024-01-12",
    overallScore: 81,
    status: "pending",
    videoAnalysisStatus: "pending",
    scraperStatus: "pending",
    resumeAnalysis: {
      skillsFound: ["Python", "TensorFlow", "PyTorch", "SQL", "Pandas", "Scikit-learn"],
      skillsMissing: ["MLOps", "Spark"],
      experienceYears: 4,
      educationMatch: 98,
      keywordMatch: 79,
    },
    videoAnalysis: {
      duration: "2:22",
      sentimentData: [
        { time: "0:00", confidence: 78 },
        { time: "0:15", confidence: 82 },
        { time: "0:30", confidence: 85 },
        { time: "0:45", confidence: 83 },
        { time: "1:00", confidence: 87 },
        { time: "1:15", confidence: 84 },
        { time: "1:30", confidence: 88 },
        { time: "1:45", confidence: 86 },
        { time: "2:00", confidence: 89 },
      ],
      transcript: [
        {
          timestamp: "0:00",
          text: "Hi, I'm Emily Rodriguez, a data scientist with expertise in machine learning and deep learning.",
        },
      ],
      overallConfidence: 85,
    },
    integrityCheck: {
      genAIProbability: 35,
      portfolioValidation: [
        { item: "GitHub Repository Analysis", status: "verified", detail: "15 ML repos, 1.2K stars total" },
        { item: "Kaggle Profile", status: "verified", detail: "Expert rank, 12 competitions" },
        { item: "LinkedIn Cross-check", status: "verified", detail: "Profile matches resume" },
        { item: "Education Verification", status: "verified", detail: "MIT, MS Data Science 2020" },
      ],
    },
  },
  {
    id: "5",
    name: "Fahrul Raqib",
    email: "raqib@gmail.com",
    phone: "+60123456789",
    role: "AI Engineer",
    appliedDate: "2024-01-11",
    overallScore: 88,
    status: "pending",
    videoAnalysisStatus: "completed",
    scraperStatus: "completed",
    videoScore: 88,
    scraperScore: 88,
    resumeAnalysis: {
      skillsFound: ["JavaScript", "Vue.js", "CSS"],
      skillsMissing: ["React", "TypeScript", "Next.js", "Testing"],
      experienceYears: 2,
      educationMatch: 70,
      keywordMatch: 55,
    },
    videoAnalysis: {
      duration: "1:45",
      sentimentData: [
        { time: "0:00", confidence: 55 },
        { time: "0:15", confidence: 58 },
        { time: "0:30", confidence: 52 },
        { time: "0:45", confidence: 60 },
        { time: "1:00", confidence: 57 },
        { time: "1:15", confidence: 62 },
        { time: "1:30", confidence: 59 },
      ],
      transcript: [
        { timestamp: "0:00", text: "Hi, I'm David Park, looking to transition into a senior frontend role." },
      ],
      overallConfidence: 88,
    },
    integrityCheck: {
      genAIProbability: 84,
      portfolioValidation: [
        { item: "GitHub Repository Analysis", status: "failed", detail: "No public repos found" },
        { item: "LinkedIn Cross-check", status: "warning", detail: "Experience gap detected" },
        { item: "Education Verification", status: "verified", detail: "Local community college" },
        { item: "Previous Employment", status: "failed", detail: "Company does not exist" },
      ],
    },
  },
  {
    "id": "6",
    "name": "Fareen Nathrah",
    "email": "fareen@gmail.com",
    "phone": "+60198765432",
    "role": "AI Engineer",
    "appliedDate": "2024-01-14",
    "overallScore": 83,
    "status": "pending",
    "videoAnalysisStatus": "completed",
    "scraperStatus": "completed",
    "videoScore": 84,
    "scraperScore": 78,
    "resumeAnalysis": {
      "skillsFound": ["Python", "TensorFlow", "Pandas", "SQL"],
      "skillsMissing": ["PyTorch", "MLOps", "Docker", "Model Deployment"],
      "experienceYears": 3,
      "educationMatch": 80,
      "keywordMatch": 63
    },
    "videoAnalysis": {
      "duration": "2:05",
      "sentimentData": [
        { "time": "0:00", "confidence": 62 },
        { "time": "0:30", "confidence": 65 },
        { "time": "1:00", "confidence": 60 },
        { "time": "1:30", "confidence": 68 },
        { "time": "2:00", "confidence": 70 }
      ],
      "transcript": [
        { "timestamp": "0:00", "text": "Hi, I'm Fareen. I work primarily with applied machine learning and data pipelines." }
      ],
      "overallConfidence": 84
    },
    "integrityCheck": {
      "genAIProbability": 42,
      "portfolioValidation": [
        { "item": "GitHub Repository Analysis", "status": "verified", "detail": "3 active ML repositories" },
        { "item": "LinkedIn Cross-check", "status": "verified", "detail": "Employment history consistent" },
        { "item": "Education Verification", "status": "verified", "detail": "Public university" },
        { "item": "Previous Employment", "status": "verified", "detail": "Company exists and matches role" }
      ]
    }
  },
  {
    "id": "7",
    "name": "Ang Wei En",
    "email": "weien@gmail.com",
    "phone": "+60191234567",
    "role": "AI Engineer",
    "appliedDate": "2024-01-16",
    "overallScore": 87,
    "status": "pending",
    "videoAnalysisStatus": "completed",
    "scraperStatus": "completed",
    "videoScore": 70,
    "scraperScore": 76,
    "resumeAnalysis": {
      "skillsFound": ["Python", "Scikit-learn", "Data Analysis"],
      "skillsMissing": ["Deep Learning", "NLP", "Cloud AI", "System Design"],
      "experienceYears": 1.5,
      "educationMatch": 65,
      "keywordMatch": 48
    },
    "videoAnalysis": {
      "duration": "1:30",
      "sentimentData": [
        { "time": "0:00", "confidence": 50 },
        { "time": "0:20", "confidence": 48 },
        { "time": "0:40", "confidence": 52 },
        { "time": "1:00", "confidence": 55 },
        { "time": "1:20", "confidence": 53 }
      ],
      "transcript": [
        { "timestamp": "0:00", "text": "Hello, I'm Wei En. I'm looking for my first full-time AI engineering role." }
      ],
      "overallConfidence": 70
    },
    "integrityCheck": {
      "genAIProbability": 61,
      "portfolioValidation": [
        { "item": "GitHub Repository Analysis", "status": "warning", "detail": "Mostly tutorial-based projects" },
        { "item": "LinkedIn Cross-check", "status": "verified", "detail": "No inconsistencies found" },
        { "item": "Education Verification", "status": "verified", "detail": "Private university" },
        { "item": "Previous Employment", "status": "warning", "detail": "Internship role only" }
      ]
    }
  },
  {
    "id": "8",
    "name": "Dinesh Ramakrishnan",
    "email": "dinesh@gmail.com",
    "phone": "+60193456789",
    "role": "AI Engineer",
    "appliedDate": "2024-01-18",
    "overallScore": 43,
    "status": "rejected",
    "videoAnalysisStatus": "completed",
    "scraperStatus": "completed",
    "videoScore": 43,
    "scraperScore": 43,
    "resumeAnalysis": {
      "skillsFound": ["Python", "PyTorch", "NLP", "Docker", "AWS"],
      "skillsMissing": ["Data Governance", "Security Compliance"],
      "experienceYears": 5,
      "educationMatch": 85,
      "keywordMatch": 78
    },
    "videoAnalysis": {
      "duration": "2:20",
      "sentimentData": [
        { "time": "0:00", "confidence": 75 },
        { "time": "0:30", "confidence": 78 },
        { "time": "1:00", "confidence": 80 },
        { "time": "1:30", "confidence": 82 },
        { "time": "2:00", "confidence": 85 }
      ],
      "transcript": [
        { "timestamp": "0:00", "text": "Hi, I'm Dinesh. I've been building and deploying NLP models in production environments." }
      ],
      "overallConfidence": 92
    },
    "integrityCheck": {
      "genAIProbability": 29,
      "portfolioValidation": [
        { "item": "GitHub Repository Analysis", "status": "verified", "detail": "Well-documented production-grade repos" },
        { "item": "LinkedIn Cross-check", "status": "verified", "detail": "Career progression consistent" },
        { "item": "Education Verification", "status": "verified", "detail": "Recognized engineering university" },
        { "item": "Previous Employment", "status": "verified", "detail": "Multinational tech company" }
      ]
    }
  }
]

export const dashboardMetrics = {
  totalCandidates: 156,
  averageMatchScore: 74,
  pendingVideoReviews: 23,
  shortlistedThisWeek: 12,
  interviewsScheduled: 8,
  newApplicationsToday: 7,
}

export const topCandidates = mockCandidates.sort((a, b) => b.overallScore - a.overallScore).slice(0, 5)
