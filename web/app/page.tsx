import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Briefcase } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-8 text-center">
        <div>
          <h1 className="text-4xl font-bold tracking-tight lg:text-5xl">Welcome to DeepScreen</h1>
          <p className="mt-4 text-xl text-muted-foreground">
            The next generation recruiting platform.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 max-w-2xl mx-auto pt-8">
          <Card className="hover:border-primary/50 transition-colors">
            <CardHeader>
              <Users className="w-12 h-12 mx-auto text-primary mb-4" />
              <CardTitle>I am an Applicant</CardTitle>
              <CardDescription>
                Looking for jobs? Upload your resume and video introduction to apply.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full" size="lg">
                <Link href="/applicant/signin">Find a job</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/50 transition-colors">
            <CardHeader>
              <Briefcase className="w-12 h-12 mx-auto text-primary mb-4" />
              <CardTitle>I am an HR Manager</CardTitle>
              <CardDescription>
                Hiring talent? Post jobs, review applicants, and run AI analysis.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full" variant="outline" size="lg">
                <Link href="/hr/signin">Manage Hiring</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
