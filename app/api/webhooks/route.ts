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

//fungsi untuk mengecek apakah nomor sender telat disimpan di auth firebase atau belum
async function checkIfPhoneRegistered(username08: string): Promise<boolean> {
    const baseUrl = process.env.FIREBASE_DB_URL;
    if (!baseUrl) {
        console.warn('FIREBASE_DB_URL not set. Assuming phone not registered.');
        return false;
    }

    const trimmed = baseUrl.replace(/\/+$/, '');
    const url = `${trimmed}/auth/${encodeURIComponent(username08)}.json`;

    try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) {
            console.error('Failed to check phone registration:', res.status);
            return false;
        }
        const data: unknown = await res.json();
        // Realtime DB returns null if key doesn't exist
        return data !== null;
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('Error checking phone registration:', message);
        return false;
    }
}

function normalizePhone(raw: string): string {
    const d = String(raw || '').replace(/\D+/g, '');
    if (!d) return '';
    if (d.startsWith('62')) return d;
    if (d.startsWith('0')) return '62' + d.slice(1);
    if (d.startsWith('8')) return '62' + d;
    return d;
}

function generateUsernameFromPhone(phone: string): string {
    //username tidak menggunakan 62 jika nomor 628xxxxxx maka username adalah 08xxxxxx
    if (phone.startsWith('62')) {
        return '0' + phone.slice(2);
    }
    return phone;
}

async function sendWhatsappReplyWablas(phone: string, message: string) {
    const token = process.env.WABLAS_TOKEN;
    const secret = process.env.WABLAS_SECRET_KEY; // opsional, jika dibutuhkan header terpisah
    const base = process.env.WABLAS_URL || "https://sby.wablas.com/api/";
    const apiUrl = `${base}send-message`;

    if (!token) {
        console.warn('WABLAS_TOKEN not set. Skipping WA reply.');
        return;
    }

    console.log(`Sending WA reply via Wablas to ${phone}: ${message} ---> ${apiUrl}`);


    const phoneClean = normalizePhone(phone);
    const messageClean = String(message || '').replace(/\r\n/g, '\n').trim();

    if (!phoneClean || !messageClean) {
        console.warn('Invalid phone/message for Wablas:', { phoneClean, messageClean });
        return;
    }

    // const headers: Record<string, string> = {
    //     'Content-Type': 'application/x-www-form-urlencoded',
    //     Accept: 'application/json',
    //     //Authorization: token, // Wablas umumnya butuh token mentah (tanpa "Bearer")
    //     Authorization: secret ? `${token}.${secret}` : token, // jika instance Anda mewajibkan secret digabung di header Authorization
    // };
    // if (secret) headers['X-Secret'] = secret; // jika instance Anda mewajibkan secret terpisah

    const body = new URLSearchParams({
        phone: phoneClean,
        message: messageClean,
    }).toString();

    const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
            Authorization: secret ? `${token}.${secret}` : token,
        },
        body,
    });

    const text = await res.text().catch(() => '');
    if (!res.ok) {
        console.error('Failed to send WA via Wablas:', res.status, text);
        return;
    }
    try {
        const json = JSON.parse(text);
        console.log('Wablas response:', json);
    } catch {
        console.log('Wablas response text:', text);
    }
}

async function writeToRealtimeDatabase(
    username08: string,
    record: Record<string, unknown>
): Promise<void> {
    const baseUrl = process.env.FIREBASE_DB_URL;
    if (!baseUrl) {
        console.warn('FIREBASE_DB_URL not set. Skipping DB write.');
        return;
    }

    const trimmed = baseUrl.replace(/\/+$/, '');
    const secret = process.env.FIREBASE_DATABASE_SECRET; // opsional
    const url =
        `${trimmed}/auth/${encodeURIComponent(username08)}.json` +
        (secret ? `?auth=${encodeURIComponent(secret)}` : '');

    const res = await fetch(url, {
        method: 'PUT', // set langsung di key: /auth/{username08}
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
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
            //username tidak menggunakan 62
            //const phone = String(senderPhone).trim();
            //cek apakah nomor sudah terdaftar di auth firebase atau belum
            const username = String(senderPhone).trim();
            const usernameFinal = generateUsernameFromPhone(username);
            const isRegistered = await checkIfPhoneRegistered(usernameFinal);
            if (isRegistered) {
                //jika sudah terdaftar, kirim pesan bahwa nomor sudah terdaftar
                const replyMessage = `Nomor ${username} sudah terdaftar. Silakan login di https://forsil99.id/ dengan username & password Anda.`;
                await sendWhatsappReplyWablas(username, replyMessage);
                return NextResponse.json({ ok: true, info: 'Phone already registered' }, { status: 200 });
            }

            const plain = genRandomPasswordPlain(7);
            const hashed = md5(plain);
            const password = `${plain}`;
            //username yang dikirim dan disimpan ke firebase sebagai username tidak menggunakan 62, namun untuk mengirim pesan WA tetap menggunakan 62                       
            const replyMessage =
                `Akun pendaftaran:\n` +
                `Username: ${usernameFinal}\n` +
                `Password: ${password}`
                + `\n\nSilakan login di https://forsil99.id/ dengan username & password tersebut.`;

            // Send WhatsApp reply
            await sendWhatsappReplyWablas(username, replyMessage);

            // write ke firebase dengan index adalah nomor telp usernameFinal
            await writeToRealtimeDatabase(usernameFinal, {
                username: usernameFinal,
                password: hashed,
                createdAt: new Date().toLocaleDateString('id-ID') //Date.now(), // jika ingin format dd/mm/yyyy: new Date().toLocaleDateString('id-ID')
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