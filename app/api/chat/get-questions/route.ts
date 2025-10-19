import { NextResponse } from "next/server";
import { generateClarifyingQuestions } from "@/lib/ai";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { prompt } = body;

        console.log("[API] POST /api/chat/get-questions request begin");

        // Validate prompt
        if (!prompt) {
            return NextResponse.json(
                { error: "Prompt is required" },
                { status: 400 }
            );
        }

        // Generate clarifying questions using AI
        const questions = await generateClarifyingQuestions(prompt);

        console.log("[API] Clarifying questions generated successfully");
        return NextResponse.json(
            { questions },
            { status: 200 }
        );
    } catch (error) {
        console.error("[API] Unexpected error generating clarifying questions:", error);
        return NextResponse.json(
            { error: `Failed to generate questions: ${error instanceof Error ? error.message : 'Unknown error'}` },
            { status: 500 }
        );
    }
}
