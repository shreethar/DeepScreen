import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get("url");

    if (!url) {
        return new NextResponse("Missing 'url' parameter", { status: 400 });
    }

    try {
        const response = await fetch(url);
        if (!response.ok) {
            return new NextResponse(`Failed to fetch file: ${response.statusText}`, { status: response.status });
        }

        const blob = await response.blob();
        const headers = new Headers();
        headers.set("Content-Type", response.headers.get("Content-Type") || "application/octet-stream");

        return new NextResponse(blob, { headers });
    } catch (error) {
        console.error("Proxy fetch error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
