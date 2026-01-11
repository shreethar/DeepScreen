"use server"

import { adminAuth } from "@/lib/firebase-admin"

export async function signupApplicant(prevState: any, formData: FormData) {
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const displayName = formData.get("name") as string
    const phoneNumber = formData.get("phone") as string

    if (!email || !password || !displayName || !phoneNumber) {
        return { success: false, message: "All fields are required" }
    }

    try {
        // 1. Create the user
        const userRecord = await adminAuth.createUser({
            email,
            password,
            displayName,
            phoneNumber,
            emailVerified: true,
            disabled: false,
        })

        // 2. Assign custom claims (role) to the user
        await adminAuth.setCustomUserClaims(userRecord.uid, {
            role: "applicant",
        })

        return { success: true, message: "Account created successfully. Please sign in." }
    } catch (error: any) {
        console.error("Error creating user:", error)
        return { success: false, message: error.message || "Failed to create account" }
    }
}
