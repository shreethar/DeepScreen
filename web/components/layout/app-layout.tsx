"use client"

import type React from "react"

import { useState } from "react"
import { Sidebar } from "./sidebar"
import { TopBar } from "./top-bar"
import { UploadModal } from "@/components/upload-modal"

interface AppLayoutProps {
  children: React.ReactNode
  breadcrumbs?: { label: string; href?: string }[]
}

export function AppLayout({ children, breadcrumbs }: AppLayoutProps) {
  const [uploadModalOpen, setUploadModalOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="pl-64 transition-all duration-300">
        <TopBar breadcrumbs={breadcrumbs} onUploadClick={() => setUploadModalOpen(true)} />
        <main className="p-6">{children}</main>
      </div>
      <UploadModal open={uploadModalOpen} onOpenChange={setUploadModalOpen} />
    </div>
  )
}
