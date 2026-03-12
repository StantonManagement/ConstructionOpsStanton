import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    port: process.env.PORT || 'not set',
    env: process.env.NODE_ENV
  });
}
