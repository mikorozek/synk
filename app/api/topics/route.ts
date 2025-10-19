import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { discoverSources, generateTitle } from "@/lib/ai";

export async function GET() {
    try {
        const topics = await prisma.topic.findMany({
            orderBy: {
                createdAt: 'desc'
            }
        });
        return NextResponse.json(topics);
    } catch (error) {
        console.error("Error fetching topics:", error);
        return NextResponse.json({ error: "Failed to fetch topics, error: " + error }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { prompt, conversation } = body;

        console.log("[API] POST request begin");

        // Step 1: Validate prompt
        if (!prompt) {
            return NextResponse.json(
                { error: "Prompt is required" },
                { status: 400 }
            );
        }

        // Build effective prompt from conversation if provided
        let effectivePrompt = prompt;
        if (conversation && Array.isArray(conversation) && conversation.length > 0) {
            console.log("[API] Processing conversation context");
            effectivePrompt = conversation
                .map((msg: { role: string; content: string }) =>
                    `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
                )
                .join('\n');
        }

        // Step 2 & 3: Call AI models in parallel for speed
        let sourcesResult;
        let titleResult;
        try {
            // Run source discovery and title generation in parallel
            [sourcesResult, titleResult] = await Promise.all([
                discoverSources(effectivePrompt, !!conversation),
                generateTitle(effectivePrompt, !!conversation)
            ]);
        } catch (error) {
            console.error("[API] AI processing failed:", error);
            return NextResponse.json(
                { error: `Failed to process topic: ${error instanceof Error ? error.message : 'Unknown error'}` },
                { status: 500 }
            );
        }

        // Step 4: Create topic in database
        let newTopic;
        try {
            console.log("[API] Creating topic in database");
            newTopic = await prisma.topic.create({
                data: {
                    title: titleResult.title,
                    prompt: prompt
                }
            });
            console.log(`[API] Topic created with ID: ${newTopic.id}`);
        } catch (error) {
            console.error("[API] Topic creation failed:", error);
            return NextResponse.json(
                { error: `Failed to create topic: ${error instanceof Error ? error.message : 'Unknown error'}` },
                { status: 500 }
            );
        }

        // Step 5: Store conversation history for this topic
        if (conversation && Array.isArray(conversation) && conversation.length > 0) {
            try {
                console.log(`[API] Persisting ${conversation.length} conversation messages for topic ${newTopic.id}`);
                await prisma.topicConversationMessage.createMany({
                    data: conversation.map((msg: { role: string; content: string }) => ({
                        topicId: newTopic.id,
                        role: msg.role === 'assistant' ? 'assistant' : 'user',
                        content: msg.content
                    }))
                });
            } catch (error) {
                console.error("[API] Failed to store conversation history:", error);
            }
        }

        // Step 6: Store sources in database
        const savedSources = [];
        for (const source of sourcesResult.sources) {
            try {
                console.log(`[API] Saving source: ${source.url}`);
                await prisma.source.create({
                    data: {
                        topicId: newTopic.id,
                        sourceUrl: source.url,
                        type: source.type
                    }
                });
                savedSources.push(source);
            } catch (error) {
                // Log error but continue - source storage failures don't break the request
                console.error(`[API] Failed to save source ${source.url}:`, error);
            }
        }

        // Step 6.5: Create initial event from the initial report
        try {
            console.log(`[API] Creating initial event for topic ${newTopic.id}`);
            await prisma.event.create({
                data: {
                    topicId: newTopic.id,
                    title: sourcesResult.initialReport.title,
                    summary: sourcesResult.initialReport.summary,
                    eventUrl: null,
                    publishedAt: new Date(),
                    contentDiff: null,
                    unread: true
                }
            });
            console.log('[API] Initial event created successfully');
        } catch (error) {
            console.error('[API] Failed to create initial event:', error);
            // Don't fail the request if initial event creation fails
        }

        // Step 7: Return response with topic data and AI-generated sources
        console.log("[API] POST request completed successfully");
        return NextResponse.json(
            {
                topic: {
                    id: newTopic.id,
                    title: newTopic.title,
                    prompt: newTopic.prompt,
                    createdAt: newTopic.createdAt
                },
                sources: sourcesResult.sources.map(s => ({
                    url: s.url,
                    type: s.type,
                    description: s.description
                }))
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("[API] Unexpected error creating topic:", error);
        return NextResponse.json(
            { error: `Failed to create topic: ${error instanceof Error ? error.message : 'Unknown error'}` },
            { status: 500 }
        );
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json(
                { error: "Topic ID is required" },
                { status: 400 }
            );
        }

        await prisma.topic.delete({
            where: { id: parseInt(id) },
        });

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error("Error deleting topic:", error);
        return NextResponse.json(
            { error: "Failed to delete topic, error: " + error },
            { status: 500 }
        );
    }
}

export async function PATCH(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        const body = await request.json();
        const { title } = body;

        if (!id) {
            return NextResponse.json(
                { error: "Topic ID is required" },
                { status: 400 }
            );
        }

        if (!title) {
            return NextResponse.json(
                { error: "Title is required" },
                { status: 400 }
            );
        }

        const updatedTopic = await prisma.topic.update({
            where: { id: parseInt(id) },
            data: { title },
        });

        return NextResponse.json(updatedTopic, { status: 200 });
    } catch (error) {
        console.error("Error updating topic:", error);
        return NextResponse.json(
            { error: "Failed to update topic, error: " + error },
            { status: 500 }
        );
    }
}
