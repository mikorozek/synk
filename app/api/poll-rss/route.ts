import { NextResponse } from 'next/server';
import { pollRSSSources } from '@/lib/rss-poller';

export async function POST() {
  try {
    const result = await pollRSSSources();

    console.log('RSS Polling completed:', {
      polled: result.polled,
      successful: result.successful,
      failed: result.failed,
      newEvents: result.newEvents,
      duration: `${result.duration.toFixed(2)}s`
    });

    if (result.errors.length > 0) {
      console.error('RSS Polling errors:', result.errors);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('RSS Polling failed:', error);

    return NextResponse.json(
      {
        error: 'RSS polling failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
