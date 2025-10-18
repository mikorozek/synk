import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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
        const { prompt } = body;

        console.log("post request begin");

        if (!prompt) {
            return NextResponse.json(
                { error: "Prompt is required" },
                { status: 400 }
            );
        }

        const title = prompt.split(/[.\n]/)[0].substring(0, 50).trim();

        const newTopic = await prisma.topic.create({
            data: {
                title: title,
                prompt: prompt
            }
        });

        return NextResponse.json(newTopic, { status: 201 });
    } catch (error) {
        console.error("Error creating topic:", error);
        return NextResponse.json(
            { error: "Failed to create topic, error: " + error },
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
