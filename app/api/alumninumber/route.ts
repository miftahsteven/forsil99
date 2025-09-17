import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function parseMaxId(data: unknown): number {
    let lastId = 0;
    if (data && typeof data === 'object') {
        const values = Object.values(data as Record<string, unknown>);
        for (const v of values) {
            if (v && typeof v === 'object') {
                const idUnknown = (v as { id?: unknown }).id;
                const id =
                    typeof idUnknown === 'number'
                        ? idUnknown
                        : Number.parseInt(String(idUnknown ?? '0'), 10);
                if (!Number.isNaN(id) && id > lastId) lastId = id;
            }
        }
    }
    return lastId;
}

export async function POST() {
    try {
        const base = (process.env.FIREBASE_DB_URL || '').replace(/\/+$/, '');
        if (!base) throw new Error('FIREBASE_DB_URL not set');

        const secret = process.env.FIREBASE_DATABASE_SECRET || '';
        const authQ = secret ? `auth=${encodeURIComponent(secret)}` : '';

        // 1) Coba query terindeks
        const q1 = new URLSearchParams();
        q1.set('orderBy', JSON.stringify('id')); // -> "id"
        q1.set('limitToLast', '1');
        if (secret) q1.set('auth', secret);

        let url = `${base}/alumni.json?${q1.toString()}`;
        let res = await fetch(url, { cache: 'no-store' });

        // 2) Jika gagal (mis. 400), fallback ambil semua lalu hitung max id
        if (!res.ok) {
            const bodyText = await res.text().catch(() => '');
            console.warn('Primary query failed:', res.status, bodyText);

            url = `${base}/alumni.json${authQ ? `?${authQ}` : ''}`;
            res = await fetch(url, { cache: 'no-store' });
            if (!res.ok) {
                const body2 = await res.text().catch(() => '');
                throw new Error(`Firebase error ${res.status} ${body2}`);
            }
        }

        const data: unknown = await res.json().catch(() => null);
        const lastId = parseMaxId(data);

        return NextResponse.json({ newId: lastId + 1 });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('Error Ambil Data ID pada /alumni:', message);
        return NextResponse.json(
            { error: 'Gagal Melakukan Generate Nomor Induk' },
            { status: 500 }
        );
    }
}