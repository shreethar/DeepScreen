"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Briefcase, FileText, User, LogOut } from "lucide-react"

export default function ApplicantLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()

    const links = [
        { href: "/applicant/jobs", label: "Jobs", icon: Briefcase },
        { href: "/applicant/profile", label: "My Profile", icon: User },
    ]

    // Don't show sidebar for signup or signin
    if (pathname === '/applicant/signup' || pathname === '/applicant/signin') {
        return <>{children}</>
    }

    return (
        <div className="min-h-screen bg-background">
            <aside className="fixed left-0 top-0 z-30 h-screen w-64 border-r border-border bg-card flex flex-col">
                <div className="flex h-16 items-center border-b border-border px-6">
                    <Link href="/applicant/jobs" className="flex items-center gap-2 font-semibold">
                        <span className="text-xl">DeepScreen</span>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            Applicant
                        </span>
                    </Link>
                </div>
                <div className="px-4 py-6 flex-1">
                    <nav className="space-y-1">
                        {links.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/50",
                                    pathname === link.href ? "bg-muted text-foreground" : "text-muted-foreground"
                                )}
                            >
                                <link.icon className="h-4 w-4" />
                                {link.label}
                            </Link>
                        ))}
                    </nav>
                </div>
                <div className="p-4 border-t border-border mt-auto">
                    <Link
                        href="/"
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-red-50 text-red-500 hover:text-red-600"
                    >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                    </Link>
                </div>
            </aside>
            <div className="pl-64">
                <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <div className="font-semibold">Applicant Portal</div>
                </header>
                <main className="p-6">{children}</main>
            </div>
        </div>
    )
}
