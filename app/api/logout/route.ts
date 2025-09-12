import { NextResponse } from 'next/server';

export async function POST() {
  const res = NextResponse.json({ success: true });
  // Hapus cookie session & username
  res.cookies.set('session', '', { path: '/', maxAge: 0 });
  res.cookies.set('username', '', { path: '/', maxAge: 0 });
  return res;
}

export function GET() {
  return NextResponse.json({ success: false, error: 'Use POST' }, { status: 405 });
}