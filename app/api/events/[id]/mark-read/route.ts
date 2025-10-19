import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = parseInt(params.id);

    if (isNaN(eventId)) {
      return NextResponse.json(
        { error: 'Invalid event ID' },
        { status: 400 }
      );
    }

    const event = await prisma.event.update({
      where: { id: eventId },
      data: { unread: false }
    });

    return NextResponse.json(event);
  } catch (error) {
    console.error('Failed to mark event as read:', error);

    return NextResponse.json(
      { error: 'Failed to mark event as read' },
      { status: 500 }
    );
  }
}
