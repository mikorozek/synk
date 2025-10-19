import { NextResponse } from "next/server";
import { pollStaticSites } from "@/lib/static-site-poller";

export async function POST() {
    try {
        console.log("[API] Starting static site polling...");
        const result = await pollStaticSites();
        
        console.log("[API] Static site polling completed:", result);
        
        return NextResponse.json({
            success: true,
            result
        });
    } catch (error) {
        console.error("[API] Static site polling failed:", error);
        return NextResponse.json(
            { 
                success: false, 
                error: error instanceof Error ? error.message : "Unknown error" 
            },
            { status: 500 }
        );
    }
}