"use client"

import { Bell, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface TopBarProps {
  breadcrumbs?: { label: string; href?: string }[]
  onUploadClick?: () => void
}

export function TopBar({ breadcrumbs = [], onUploadClick }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card px-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2">
        <nav className="flex items-center gap-1 text-sm">
          <span className="font-medium text-foreground">AI Resume Screener</span>
          {breadcrumbs.map((crumb, index) => (
            <span key={index} className="flex items-center gap-1">
              <span className="text-muted-foreground">/</span>
              <span className={index === breadcrumbs.length - 1 ? "text-foreground" : "text-muted-foreground"}>
                {crumb.label}
              </span>
            </span>
          ))}
        </nav>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search candidates..."
            className="w-64 pl-9 bg-background"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const target = e.target as HTMLInputElement;
                if (target.value.trim()) {
                  window.location.href = `/hr/candidates?search=${encodeURIComponent(target.value.trim())}`;
                }
              }
            }}
          />
        </div>



        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#EF4444] text-[10px] text-white">
            3
          </span>
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarImage src="/professional-headshot.png" alt="User" />
                <AvatarFallback className="bg-[#3B82F6] text-white">JD</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">Jane Doe</p>
                <p className="text-xs text-muted-foreground">jane@company.com</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-[#EF4444]">Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
