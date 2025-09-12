import { NextRequest, NextResponse } from 'next/server';
import md5 from 'blueimp-md5';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DB_URL = process.env.FIREBASE_DB_URL || 'https://forsil99-default-rtdb.asia-southeast1.firebasedatabase.app/';

type LoginPayload = { username: string; password: string };
type User = { username: string; password: string; role?: string };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function isLoginPayload(v: unknown): v is LoginPayload {
  return (
    isRecord(v) &&
    typeof v.username === 'string' &&
    typeof v.password === 'string'
  );
}

function isUser(v: unknown): v is User {
  return (
    isRecord(v) &&
    typeof v.username === 'string' &&
    typeof v.password === 'string'
  );
}

export async function POST(req: NextRequest) {
  // Parse & validate body
  const bodyUnknown = (await req.json().catch(() => null)) as unknown;
  if (!isLoginPayload(bodyUnknown)) {
    return NextResponse.json(
      { success: false, error: 'Username & password wajib diisi' },
      { status: 400 }
    );
  }
  const { username, password } = bodyUnknown;

  // SUPER ADMIN bypass (opsional)
  if (username === 'superadmin' && password === 'B47054ii') {
    return createSessionResponse(username);
  }

  // Ambil data auth dari Realtime DB
  const res = await fetch(`${DB_URL}/auth.json`, { cache: 'no-store' });
  if (!res.ok) {
    return NextResponse.json(
      { success: false, error: `Firebase fetch failed (${res.status})` },
      { status: 502 }
    );
  }

  const dbUnknown = (await res.json()) as unknown;
  if (!isRecord(dbUnknown)) {
    return NextResponse.json(
      { success: false, error: 'Data auth kosong / format salah' },
      { status: 404 }
    );
  }

  const values = Object.values(dbUnknown) as unknown[];
  const matched = values.find(
    (u) => isUser(u) && u.username === username && u.password === md5(password)
  );

  if (!matched) {
    return NextResponse.json(
      { success: false, error: 'Kredensial salah' },
      { status: 401 }
    );
  }

  return createSessionResponse(username);
}

function createSessionResponse(username: string) {
  const token = Buffer.from(`${username}.${Date.now()}`).toString('base64');
  const res = NextResponse.json({ success: true, token }, { status: 200 });
  res.cookies.set('session', token, {
    httpOnly: true,
    path: '/',
    maxAge: 60 * 60 * 8,
    sameSite: 'lax',
  });
  res.cookies.set('username', username, {
    httpOnly: false,
    path: '/',
    maxAge: 60 * 60 * 8,
    sameSite: 'lax',
  });
  return res;
}

export function GET() {
  return NextResponse.json({ success: false, error: 'Use POST' }, { status: 405 });
}