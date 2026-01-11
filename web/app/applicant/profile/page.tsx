"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, Video, Mail, Phone, MapPin, Briefcase } from "lucide-react"

export default function ApplicantProfilePage() {
    // Mock user data simulating a logged-in applicant
    const user = {
        name: "Shreethar Raveenthar",
        email: "shree80537901@gmail.com",
        phone: "+60 1160695538",
        role: "Senior AI Engineer",
        location: "Puchong, Selangor",
        initials: "SR",
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-foreground">My Profile</h1>
                <p className="text-muted-foreground">Manage your personal information and documents</p>
            </div>

            <div className="grid gap-6 md:grid-cols-[300px_1fr]">
                {/* Sidebar / Profile Card */}
                <Card>
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4">
                            <Avatar className="h-24 w-24">
                                <AvatarFallback className="text-2xl">{user.initials}</AvatarFallback>
                            </Avatar>
                        </div>
                        <CardTitle>{user.name}</CardTitle>
                        <CardDescription>{user.role}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-4 w-4" />
                            <span>{user.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-4 w-4" />
                            <span>{user.phone}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span>{user.location}</span>
                        </div>
                        <div className="pt-4">
                            <Button className="w-full" variant="outline">Edit Profile</Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Main Content */}
                <div className="space-y-6">
                    <Tabs defaultValue="documents">
                        <TabsList>
                            <TabsTrigger value="documents">Documents</TabsTrigger>
                            <TabsTrigger value="applications">Applications</TabsTrigger>
                            <TabsTrigger value="settings">Settings</TabsTrigger>
                        </TabsList>

                        <TabsContent value="documents" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Resume & Video</CardTitle>
                                    <CardDescription>Manage your application materials.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between rounded-lg border p-4">
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                                                <FileText className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="font-medium">Resume.pdf</p>
                                                <p className="text-sm text-muted-foreground">Uploaded on Dec 12, 2024</p>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="sm">Update</Button>
                                    </div>

                                    <div className="flex items-center justify-between rounded-lg border p-4">
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600">
                                                <Video className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="font-medium">Intro_Video.mp4</p>
                                                <p className="text-sm text-muted-foreground">Uploaded on Dec 10, 2024</p>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="sm">Update</Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="applications">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Recent Applications</CardTitle>
                                    <CardDescription>Track the status of your job applications.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                                            <div className="flex items-center gap-4">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                                                    <Briefcase className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">Senior Frontend Engineer</p>
                                                    <p className="text-sm text-muted-foreground">Engineering • Applied 2 days ago</p>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Pending Review</Badge>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="settings">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Account Settings</CardTitle>
                                    <CardDescription>Manage your account preferences.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="current-password">Current Password</Label>
                                        <Input id="current-password" type="password" />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="new-password">New Password</Label>
                                        <Input id="new-password" type="password" />
                                    </div>
                                    <Button>Change Password</Button>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    )
}
