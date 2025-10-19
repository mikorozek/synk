import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { topicId } = body;

        const result = await prisma.event.updateMany({
            where: topicId ? { topicId: parseInt(topicId) } : {},
            data: { unread: false }
        });

        return NextResponse.json({
            success: true,
            count: result.count
        });
    } catch (error) {
        console.error('Failed to mark events as read:', error);

        return NextResponse.json(
            { error: 'Failed to mark events as read' },
            { status: 500 }
        );
    }
}
