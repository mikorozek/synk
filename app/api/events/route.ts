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
