import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, ref, remove, get } from 'firebase/database';
import { getAuth, deleteUser } from 'firebase/auth';
import { initializeApp } from 'firebase/app';


export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
    try {
        const { key } = await req.json();
        if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 });

        const base = (process.env.FIREBASE_DB_URL || '').replace(/\/+$/, '');
        if (!base) throw new Error('FIREBASE_DB_URL not set');
        const secret = process.env.FIREBASE_DATABASE_SECRET || '';
        const authQ = secret ? `?auth=${encodeURIComponent(secret)}` : '';

        const url = `${base}/alumni/${encodeURIComponent(key)}.json${authQ}`;
        const res = await fetch(url, { method: 'DELETE', cache: 'no-store' });
        if (!res.ok) {
            const body = await res.text().catch(() => '');
            throw new Error(`Firebase error ${res.status} ${body}`);
        }
        return NextResponse.json({ ok: true });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}