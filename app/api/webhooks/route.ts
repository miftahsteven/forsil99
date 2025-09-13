import { NextResponse } from 'next/server';
import { createHash } from 'crypto';

// app/api/webhooks/route.ts

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Expected env vars:
// - WABLAS_API_URL (e.g. https://[your-domain].wablas.com/api/send-message)
// - WABLAS_TOKEN   (API token from Wablas; usually sent as plain value in "Authorization" header)
// - FIREBASE_DATABASE_URL (e.g. https://your-project-id.firebaseio.com)
// - FIREBASE_DATABASE_SECRET (optional database secret or auth token for REST write)

//type AnyJson = Record<string, any>;
function isObject(v: unknown): v is Record<string, unknown> {
    return typeof v === 'object' && v !== null;
}
function getStr(o: unknown, key: string): string | undefined {
    if (!isObject(o)) return undefined;
    const v = o[key];
    return typeof v === 'string' ? v : undefined;
}

function extractMessage(body: unknown): string | undefined {
    const direct = getStr(body, 'message') || getStr(body, 'text') || getStr(body, 'body');
    if (direct) return direct;
    // nested: body.message.text
    if (isObject(body) && isObject(body.message)) {
        const mt = getStr(body.message, 'text');
        if (mt) return mt;
    }
    // array: body.messages[0].text|message
    if (isObject(body)) {
        const messages = body['messages'];
        if (Array.isArray(messages) && messages.length) {
            const first = messages[0];
            return getStr(first, 'text') || getStr(first, 'message');
        }
    }
    return undefined;
}

function extractSenderPhone(body: unknown): string | undefined {
    const direct =
        getStr(body, 'phone') ||
        getStr(body, 'sender') ||
        getStr(body, 'from') ||
        getStr(body, 'wa_number');
    if (direct) return direct;
    if (isObject(body)) {
        const messages = body['messages'];
        if (Array.isArray(messages) && messages.length) {
            return getStr(messages[0], 'from');
        }
    }
    return undefined;
}

function genRandomPasswordPlain(len = 7): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let out = '';
    for (let i = 0; i < len; i++) {
        out += chars[Math.floor(Math.random() * chars.length)];
    }
    return out;
}

function md5(input: string): string {
    return createHash('md5').update(input).digest('hex');
}

async function sendWhatsappReplyWablas(phone: string, message: string) {
    //const apiUrl = process.env.WABLAS_API_URL;
    const token = process.env.WABLAS_TOKEN;
    const secret = process.env.WABLAS_SECRET_KEY;

    if (!token) {
        console.warn('WABLAS_API_URL or WABLAS_TOKEN not set. Skipping WA reply.');
        return;
    }

    const apiUrl = "https://sby.wablas.com/api/send-message"; // Example endpoint

    const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            // Wablas usually expects raw token (no "Bearer ")
            //'Authorization': token,
            'Authorization': `${token}.${secret}`,
            'Accept': 'application/json',
        },
        body: JSON.stringify({ phone, message }),
    });

    if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error('Failed to send WA via Wablas:', res.status, text);
    }
}

async function writeToRealtimeDatabase(payload: Record<string, unknown>) {
    const baseUrl = process.env.FIREBASE_DB_URL;
    //const secret = process.env.FIREBASE_DATABASE_SECRET;

    if (!baseUrl) {
        console.warn('FIREBASE_DATABASE_URL not set. Skipping DB write.');
        return;
    }

    //const url = `${baseUrl.replace(/\/$/, '')}/alumni/auth.json${secret ? `?auth=${encodeURIComponent(secret)}` : ''}`;
    const url = `${baseUrl.replace(/\/$/, '')}/auth.json`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error('Failed to write to Realtime Database:', res.status, text);
    }
}

export async function POST(req: Request) {
    try {
        const body: unknown = await req.json();

        // Log the entire payload and the message specifically
        console.log('Incoming webhook body:', body);
        const msg = extractMessage(body);
        console.log('Incoming message text:', msg);

        const senderPhone = extractSenderPhone(body);

        if (!msg || !senderPhone) {
            return NextResponse.json({ ok: true, info: 'Missing message or sender phone' }, { status: 200 });
        }

        if (msg.toLowerCase().includes('daftar')) {
            const username = String(senderPhone).trim();
            const plain = genRandomPasswordPlain(7);
            const hashed = md5(plain);

            const replyMessage =
                `Akun pendaftaran:\n` +
                `Username: ${username}\n` +
                `Password: ${hashed}`;

            // Send WhatsApp reply
            await sendWhatsappReplyWablas(username, replyMessage);

            // Save to Firebase Realtime Database (username + md5 password)
            await writeToRealtimeDatabase({
                username,
                password: hashed,
                createdAt: Date.now(),
            });
        }

        return NextResponse.json({ ok: true }, { status: 200 });
    } catch (err: unknown) {
        //console.error('Webhook error:', err?.message || err);
        //return NextResponse.json({ ok: false, error: 'internal_error' }, { status: 200 });
        const message =
            err && typeof err === 'object' && 'message' in err && typeof err.message === 'string'
                ? err.message
                : String(err);
        console.error('Webhook error:', message);
        return NextResponse.json({ ok: false, error: message }, { status: 200 });
    }
}