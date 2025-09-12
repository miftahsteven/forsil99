import { NextRequest, NextResponse } from 'next/server';
import md5 from 'blueimp-md5';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Gunakan env agar mudah pindah environment
// .env.local:
// FIREBASE_DB_URL=https://forsil99-default-rtdb.firebaseio.com
const DB_URL = process.env.FIREBASE_DB_URL || 'https://forsil99-default-rtdb.asia-southeast1.firebasedatabase.app/';

export async function POST(req: NextRequest) {
  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const { username, password } = payload || {};
  if (!username || !password) {
    return NextResponse.json(
      { success: false, error: 'Username & password wajib diisi' },
      { status: 400 }
    );
  }

  // SUPER ADMIN bypass (opsional)
  if (username === 'superadmin' && password === 'B47054ii') {
    return createSessionResponse(username);
  }

  // Ambil data auth dari Realtime Database
  try {
    const res = await fetch(`${DB_URL}/auth.json`, {
      // Jika database rules protected & Anda punya DB secret (deprecated) atau custom token auth=SECRET di query
      // tambahkan parameter ?auth=TOKEN
      cache: 'no-store',
    });
    if (!res.ok) {
      console.log('Firebase URL:', `${DB_URL}/auth`);

      return NextResponse.json(
        { success: false, error: `Firebase fetch failed (${res.status})` },
        { status: 502 }
      );
    }
    const data = await res.json();

    if (!data || typeof data !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Data auth kosong / format salah' },
        { status: 404 }
      );
    }

    const user = Object.values<any>(data).find(
      (u) => u.username === username && u.password === md5(String(password))
    );

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Kredensial salah' },
        { status: 401 }
      );
    }

    return createSessionResponse(username);
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: 'Firebase error: ' + e.message },
      { status: 500 }
    );
  }
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