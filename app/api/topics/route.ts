import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
    try {
        const topics = await prisma.topic.findMany();
        return NextResponse.json(topics);
    } catch (error) {
        console.error("Error fetching topics:", error);
        return NextResponse.json({ error: "Failed to fetch topics, error: " + error }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { title, prompt } = body;

        if (!title || !prompt) {
            return NextResponse.json(
                { error: "Title and prompt are required" }, 
                { status: 400 }
            );
        }

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