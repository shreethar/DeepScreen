"use client"

import { Sidebar } from "@/components/layout/sidebar"
import { TopBar } from "@/components/layout/top-bar"

import { usePathname } from "next/navigation"

export default function HRLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()

    // Don't show sidebar/topbar for signin
    if (pathname === '/hr/signin') {
        return <>{children}</>
    }

    return (
        <div className="min-h-screen bg-background">
            {/* We reuse the sidebar but we might want to customize links later. 
          For now, assuming Sidebar has 'Jobs' and 'Candidates' which works for HR. */}
            <Sidebar />
            <div className="pl-64 transition-all duration-300">
                <TopBar breadcrumbs={[{ label: "HR Portal" }]} />
                <main className="p-6">{children}</main>
            </div>
        </div>
    )
}
