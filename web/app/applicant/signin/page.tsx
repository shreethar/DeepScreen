"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "@/lib/firebase"

export default function ApplicantSigninPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            // @ts-ignore
            const email = e.target.email.value
            // @ts-ignore
            const password = e.target.password.value

            const userCredential = await signInWithEmailAndPassword(auth, email, password)
            const user = userCredential.user

            // Force refresh token to get latest claims
            const idTokenResult = await user.getIdTokenResult(true)

            if (idTokenResult.claims.role === 'applicant') {
                toast.success("Signed in successfully", {
                    description: "Welcome back to DeepScreen!",
                })
                router.push("/applicant/jobs")
            } else {
                // Not an applicant, sign out
                await auth.signOut()
                toast.error("Access Denied", {
                    description: "This account does not have applicant privileges."
                })
            }
        } catch (error: any) {
            console.error("Sign in error:", error)

            let errorMessage = "An unexpected error occurred. Please try again."

            if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                errorMessage = "Invalid email or password. Please check your credentials."
            } else if (error.message) {
                errorMessage = error.message
            }

            toast.error("Sign in failed", {
                description: errorMessage
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <Card className="max-w-md w-full border-border bg-card">
                <CardHeader>
                    <CardTitle>Sign In</CardTitle>
                    <CardDescription>Welcome back! Enter your details to continue.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" placeholder="john@example.com" required />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="password">Password</Label>
                            <Input id="password" type="password" required />
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? "Signing In..." : "Sign In"}
                        </Button>
                        <div className="text-center text-sm">
                            <span className="text-muted-foreground mr-1">Don't have an account?</span>
                            <Link href="/applicant/signup" className="text-primary hover:underline">
                                Sign Up
                            </Link>
                        </div>
                        <div className="text-center text-sm">
                            <Link href="/" className="text-muted-foreground hover:underline">
                                Back to Home
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
