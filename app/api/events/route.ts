import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const topicId = searchParams.get("topicId");

        const events = topicId
            ? await prisma.event.findMany({
                  where: { topicId: parseInt(topicId) },
                  orderBy: { createdAt: "desc" },
              })
            : await prisma.event.findMany({
                  orderBy: { createdAt: "desc" },
              });

        return NextResponse.json(events);
    } catch (error) {
        console.error("Error fetching events:", error);
        return NextResponse.json(
            { error: "Failed to fetch events, error: " + error },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { topicId, title, summary, eventUrl, publishedAt, contentDiff, unread, fromYoloMode } = body;

        // Validate required fields
        if (!topicId) {
            return NextResponse.json(
                { error: "topicId is required" },
                { status: 400 }
            );
        }

        if (!title) {
            return NextResponse.json(
                { error: "title is required" },
                { status: 400 }
            );
        }

        // Verify topic exists
        const topic = await prisma.topic.findUnique({
            where: { id: parseInt(topicId) }
        });

        if (!topic) {
            return NextResponse.json(
                { error: `Topic with id ${topicId} not found` },
                { status: 404 }
            );
        }

        // Create event
        const event = await prisma.event.create({
            data: {
                topicId: parseInt(topicId),
                title: title.substring(0, 500), // Enforce max length
                summary: summary || null,
                eventUrl: eventUrl ? eventUrl.substring(0, 1000) : null, // Enforce max length
                publishedAt: publishedAt ? new Date(publishedAt) : null,
                contentDiff: contentDiff || null,
                unread: unread !== undefined ? unread : true,
                fromYoloMode: fromYoloMode !== undefined ? fromYoloMode : false
            }
        });

        return NextResponse.json(event, { status: 201 });
    } catch (error) {
        console.error("Error creating event:", error);
        return NextResponse.json(
            { error: "Failed to create event, error: " + error },
            { status: 500 }
        );
    }
}
