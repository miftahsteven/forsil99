import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set('session', '', { path: '/', httpOnly: true, maxAge: 0 });
  res.cookies.set('username', '', { path: '/', httpOnly: false, maxAge: 0 });
  return res;
}

export function GET() {
  return NextResponse.json({ success: false, error: 'Use POST' }, { status: 405 });
}