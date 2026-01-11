"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Upload, FileText, Video, X, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface UploadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface FileUpload {
  file: File
  progress: number
  status: "uploading" | "complete" | "error"
  type: "resume" | "video"
}

export function UploadModal({ open, onOpenChange }: UploadModalProps) {
  const [files, setFiles] = useState<FileUpload[]>([])
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    processFiles(droppedFiles)
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      processFiles(selectedFiles)
    }
  }

  const processFiles = (newFiles: File[]) => {
    const validFiles = newFiles.filter((file) => {
      const ext = file.name.toLowerCase()
      return ext.endsWith(".pdf") || ext.endsWith(".mp4") || ext.endsWith(".webm")
    })

    const uploads: FileUpload[] = validFiles.map((file) => ({
      file,
      progress: 0,
      status: "uploading",
      type: file.name.toLowerCase().endsWith(".pdf") ? "resume" : "video",
    }))

    setFiles((prev) => [...prev, ...uploads])

    // Simulate upload progress
    uploads.forEach((upload, index) => {
      simulateUpload(files.length + index)
    })
  }

  const simulateUpload = (index: number) => {
    const interval = setInterval(() => {
      setFiles((prev) => {
        const updated = [...prev]
        if (updated[index]) {
          if (updated[index].progress >= 100) {
            updated[index].status = "complete"
            clearInterval(interval)
          } else {
            updated[index].progress += Math.random() * 15 + 5
            if (updated[index].progress > 100) updated[index].progress = 100
          }
        }
        return updated
      })
    }, 200)
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleClose = () => {
    setFiles([])
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground">Upload Candidate Files</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Upload PDF resumes and MP4/WebM video interviews for AI analysis
          </DialogDescription>
        </DialogHeader>

        {/* Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragOver(true)
          }}
          onDragLeave={() => setIsDragOver(false)}
          className={cn(
            "relative rounded-lg border-2 border-dashed p-8 text-center transition-colors",
            isDragOver ? "border-[#3B82F6] bg-[#3B82F6]/5" : "border-border hover:border-[#3B82F6]/50",
          )}
        >
          <input
            type="file"
            accept=".pdf,.mp4,.webm"
            multiple
            onChange={handleFileSelect}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#3B82F6]/10">
              <Upload className="h-6 w-6 text-[#3B82F6]" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Drop files here or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">Supports PDF resumes and MP4/WebM videos</p>
            </div>
          </div>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="mt-4 space-y-3">
            {files.map((upload, index) => (
              <div key={index} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg",
                    upload.type === "resume" ? "bg-[#3B82F6]/10" : "bg-[#8B5CF6]/10",
                  )}
                >
                  {upload.type === "resume" ? (
                    <FileText className="h-5 w-5 text-[#3B82F6]" />
                  ) : (
                    <Video className="h-5 w-5 text-[#8B5CF6]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{upload.file.name}</p>
                  <div className="mt-1">
                    {upload.status === "complete" ? (
                      <div className="flex items-center gap-1 text-xs text-[#10B981]">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Upload complete</span>
                      </div>
                    ) : (
                      <Progress value={upload.progress} className="h-1.5" />
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => removeFile(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            className="bg-[#3B82F6] hover:bg-[#2563EB] text-white"
            disabled={files.length === 0 || files.some((f) => f.status === "uploading")}
          >
            Process with AI
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
