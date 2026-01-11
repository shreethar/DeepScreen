"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { signupApplicant } from "@/app/actions/signup"

export default function ApplicantSignupPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsLoading(true)

        const formData = new FormData(e.currentTarget)
        const result = await signupApplicant(null, formData)

        setIsLoading(false)

        if (result.success) {
            toast.success(result.message)
            router.push("/applicant/signin")
        } else {
            toast.error(result.message)
        }
    }

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <Card className="max-w-md w-full border-border bg-card">
                <CardHeader>
                    <CardTitle>Create Applicant Account</CardTitle>
                    <CardDescription>Enter your details to start applying.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input id="name" name="name" placeholder="John Doe" required />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" name="email" type="email" placeholder="john@example.com" required />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="phone">Phone Number</Label>
                            <Input id="phone" name="phone" type="tel" placeholder="+1234567890" required />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="password">Password</Label>
                            <Input id="password" name="password" type="password" required />
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? "Creating Account..." : "Sign Up"}
                        </Button>
                        <div className="text-center text-sm">
                            <span className="text-muted-foreground mr-1">Already have an account?</span>
                            <Link href="/applicant/signin" className="text-primary hover:underline">
                                Sign In
                            </Link>
                        </div>
                        <div className="text-center text-sm">
                            <Link href="/" className="text-primary hover:underline">
                                Back to Home
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
