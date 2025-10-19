import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const eventId = parseInt(id);

    if (isNaN(eventId)) {
      return NextResponse.json(
        { error: 'Invalid event ID' },
        { status: 400 }
      );
    }

    // Get current state and toggle it
    const currentEvent = await prisma.event.findUnique({
      where: { id: eventId }
    });

    if (!currentEvent) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Toggle the unread state
    const event = await prisma.event.update({
      where: { id: eventId },
      data: { unread: !currentEvent.unread }
    });

    return NextResponse.json(event);
  } catch (error) {
    console.error('Failed to toggle event status:', error);

    return NextResponse.json(
      { error: 'Failed to toggle event status' },
      { status: 500 }
    );
  }
}
