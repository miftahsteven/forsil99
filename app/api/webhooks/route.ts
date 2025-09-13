import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';
//import bcrypt from 'bcryptjs';
import md5 from 'blueimp-md5';

// /app/api/webhooks/route.ts

type WebhookBody = {
    // Wablas can send various shapes; we handle common ones defensively
    message?: string;
    text?: string;
    content?: string;
    from?: string;
    sender?: string;
    phone?: string;
    number?: string;
    messages?: Array<{ text?: string; from?: string; sender?: string; phone?: string; number?: string }>;
    data?: any;
};

function initFirebase() {
    if (admin.apps.length) return admin.app();

    const svc = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!svc) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT is not set. Provide the service account JSON string in env.');
    }
    const parsed = JSON.parse(svc);
    admin.initializeApp({
        credential: admin.credential.cert(parsed),
    });
    return admin.app();
}

function getDb() {
    return initFirebase().firestore();
}

function normalizePhone(input?: string): string | null {
    if (!input) return null;
    // Keep digits only
    let digits = (input.match(/\d+/g) || []).join('');
    if (!digits) return null;

    // Normalize to 62XXXXXXXXXXX (Indonesia)
    if (digits.startsWith('0')) digits = `62${digits.slice(1)}`;
    if (digits.startsWith('620')) digits = `62${digits.slice(2)}`;
    if (digits.startsWith('8')) digits = `62${digits}`;
    if (digits.startsWith('62')) return digits;

    // Fallback: return as-is digits
    return digits;
}

function extractTextAndPhone(body: WebhookBody): { text: string; phone: string | null } {
    const text =
        body?.message ??
        body?.text ??
        body?.content ??
        body?.messages?.[0]?.text ??
        '';

    const phone =
        normalizePhone(
            body?.phone ??
            body?.number ??
            body?.sender ??
            body?.from ??
            body?.messages?.[0]?.phone ??
            body?.messages?.[0]?.number ??
            body?.messages?.[0]?.sender ??
            body?.messages?.[0]?.from
        ) || null;

    return { text: (text || '').toString(), phone };
}

function generatePassword(len = 10) {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
    let out = '';
    for (let i = 0; i < len; i++) {
        out += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return out;
}

async function sendWablasMessage(phone: string, message: string) {
    const token = process.env.WABLAS_TOKEN;
    const secretKey = process.env.WABLAS_SECRET_KEY;
    if (!token || !secretKey) {
        throw new Error('WABLAS_TOKEN or WABLAS_SECRET_KEY is not set');
    }
    const baseUrl =
        process.env.WABLAS_BASE_URL || 'https://sby.wablas.com/api/send-message';
    const deviceId = process.env.WABLAS_DEVICE_ID;

    if (!token) throw new Error('WABLAS_TOKEN is not set');

    const payload: Record<string, any> = {
        phone,
        message,
        priority: true,
    };
    if (deviceId) payload.device_id = deviceId;

    const res = await fetch(baseUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            //Authorization: `Bearer ${token}`,
            Authorization: `${token}.${secretKey}`,
            Accept: "application/json",
        },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Wablas send failed: ${res.status} ${res.statusText} ${text}`);
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = (await req.json().catch(() => ({}))) as WebhookBody;
        const { text, phone } = extractTextAndPhone(body);

        if (!phone) {
            return NextResponse.json({ ok: true, skipped: true, reason: 'no-phone' });
        }

        const lower = text.trim().toLowerCase();

        // Only act when user sends "daftar"
        if (!lower.includes('daftar')) {
            return NextResponse.json({ ok: true, skipped: true });
        }

        const db = getDb();
        // Store in alumni/auth with phone as doc id
        const docRef = db.collection('alumni').doc('auth').collection('users').doc(phone);
        const snap = await docRef.get();

        const username = phone; // Use phone number as username
        const loginUrl = process.env.LOGIN_URL || 'https://example.com/login';

        if (snap.exists) {
            // Already registered: do not send password again
            const message =
                `Akun sudah terdaftar.\n` +
                `Username: ${username}\n` +
                `Silakan login di ${loginUrl}. Jika lupa password, gunakan fitur "Lupa Password".`;
            await sendWablasMessage(phone, message);
            return NextResponse.json({ ok: true, status: 'already-registered' });
        }

        // Create new credentials
        const plainPassword = generatePassword(10);
        //const passwordHash = await bcrypt.hash(plainPassword, 10);
        const passwordHash = md5(plainPassword);

        await docRef.set({
            username,
            passwordHash,
            phone,
            status: 'REGISTERED',
            mustCompleteProfile: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        const reply =
            `Pendaftaran berhasil.\n` +
            `Username: ${username}\n` +
            `Password: ${plainPassword}\n` +
            `Silakan login di ${loginUrl} untuk melengkapi data.`;

        await sendWablasMessage(phone, reply);

        return NextResponse.json({ ok: true, status: 'registered' });
    } catch (err: any) {
        // Avoid leaking secrets in responses
        console.error('webhook-error', err?.message || err);
        return NextResponse.json({ ok: false, error: 'internal-error' }, { status: 500 });
    }
}

export const dynamic = 'force-dynamic';