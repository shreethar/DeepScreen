import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"

export default function SettingsPage() {
  return (
    <AppLayout breadcrumbs={[{ label: "Settings" }]}>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </div>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">API Configuration</CardTitle>
            <CardDescription>Configure your FastAPI backend connection</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-url">API Base URL</Label>
              <Input id="api-url" placeholder="https://api.example.com" defaultValue="http://localhost:8000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="api-key">API Key</Label>
              <Input id="api-key" type="password" placeholder="Enter your API key" />
            </div>
            <Button className="bg-[#3B82F6] hover:bg-[#2563EB] text-white">Save Configuration</Button>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">AI Analysis Settings</CardTitle>
            <CardDescription>Configure AI screening behavior</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Auto-analyze uploads</p>
                <p className="text-sm text-muted-foreground">Automatically run AI analysis on new uploads</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">GenAI detection</p>
                <p className="text-sm text-muted-foreground">Flag resumes with high AI-generated content</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Video sentiment analysis</p>
                <p className="text-sm text-muted-foreground">Analyze candidate confidence in video interviews</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Notifications</CardTitle>
            <CardDescription>Configure notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Email notifications</p>
                <p className="text-sm text-muted-foreground">Receive email when analysis is complete</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">High-score alerts</p>
                <p className="text-sm text-muted-foreground">Get notified for candidates scoring above 85%</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
