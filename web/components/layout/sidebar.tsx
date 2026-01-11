"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Briefcase, Users, Settings, Brain, ChevronLeft, ChevronRight, Calendar, LogOut } from "lucide-react"
import { useState } from "react"

const navItems = [
  { href: "/hr/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/hr/jobs", label: "Jobs", icon: Briefcase },
  { href: "/hr/interviews", label: "Interviews", icon: Calendar },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar text-sidebar-foreground transition-all duration-300",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3B82F6]">
            <Brain className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-sidebar-foreground">AI Screener</span>
              <span className="text-xs text-[#64748B]">Talent Intelligence</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/hr/dashboard")
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-[#3B82F6]"
                    : "text-[#94A3B8] hover:bg-sidebar-accent hover:text-sidebar-foreground",
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Sign Out */}
        <div className="mt-auto border-t border-sidebar-border p-3">
          <Link
            href="/"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-[#94A3B8] hover:bg-red-50 hover:text-red-500 transition-colors"
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </Link>
        </div>

        {/* Collapse Toggle */}
        <div className="border-t border-sidebar-border p-3">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-[#94A3B8] hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <>
                <ChevronLeft className="h-5 w-5" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  )
}
