import { NextRequest, NextResponse } from "next/server";
import admin from "firebase-admin";

// /Users/miftahsyarief/MyLab/forsil99web/app/api/webhooks/route.ts

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// -------- Firebase Admin init --------
function initFirebase() {
    if (admin.apps.length) return admin.app();

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!projectId || !clientEmail || !privateKey) {
        console.error("Missing Firebase Admin env vars");
        throw new Error("Firebase Admin is not configured");
    }

    return admin.initializeApp({
        credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
        }),
    });
}

type AnyObject = Record<string, any>;

type IncomingMsg = {
    phone?: string;
    sender?: string;
    from?: string;
    wa_number?: string;
    msisdn?: string;
    message?: string;
    text?: string;
    body?: string;
    caption?: string;
    name?: string;
};
type SafeRecord = Record<string, unknown>;

// -------- Helpers --------
const ALLOWED_PASSWORD_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

function generatePassword(length = 10) {
    // random lowercase + digits
    const arr = new Uint32Array(length);
    crypto.getRandomValues(arr);
    let out = "";
    for (let i = 0; i < length; i++) {
        out += ALLOWED_PASSWORD_CHARS[arr[i] % ALLOWED_PASSWORD_CHARS.length];
    }
    return out;
}

function isObject(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null;
}
function isString(v: unknown): v is string {
    return typeof v === "string";
}

function digitsOnly(s: string) {
    return s.replace(/\D+/g, "");
}

function normalizePhone(raw: string) {
    const d = digitsOnly(raw || "");
    if (!d) return "";
    if (d.startsWith("62")) return d;
    if (d.startsWith("0")) return "62" + d.slice(1);
    if (d.startsWith("8")) return "62" + d;
    return d;
}

function extractPhone(m: IncomingMsg): string {
    return (
        m.phone ||
        m.sender ||
        m.wa_number ||
        m.msisdn ||
        m.from ||
        ""
    );
}

function extractText(m: IncomingMsg): string {
    return (
        m.message ||
        m.text ||
        m.body ||
        m.caption ||
        ""
    );
}

function extractMessages(payload: unknown): { phone: string; text: string; raw: SafeRecord }[] {
    const out: { phone: string; text: string; raw: SafeRecord }[] = [];

    const pushIfValid = (it: unknown) => {
        if (!isObject(it)) return;
        const msg: IncomingMsg = {
            phone: isString((it as SafeRecord).phone) ? (it as SafeRecord).phone as string : undefined,
            sender: isString((it as SafeRecord).sender) ? (it as SafeRecord).sender as string : undefined,
            from: isString((it as SafeRecord).from) ? (it as SafeRecord).from as string : undefined,
            wa_number: isString((it as SafeRecord).wa_number) ? (it as SafeRecord).wa_number as string : undefined,
            msisdn: isString((it as SafeRecord).msisdn) ? (it as SafeRecord).msisdn as string : undefined,
            message: isString((it as SafeRecord).message) ? (it as SafeRecord).message as string : undefined,
            text: isString((it as SafeRecord).text) ? (it as SafeRecord).text as string : undefined,
            body: isString((it as SafeRecord).body) ? (it as SafeRecord).body as string : undefined,
            caption: isString((it as SafeRecord).caption) ? (it as SafeRecord).caption as string : undefined,
            name: isString((it as SafeRecord).name) ? (it as SafeRecord).name as string : undefined,
        };
        const phone = extractPhone(msg);
        const text = extractText(msg);
        if (phone && text) out.push({ phone, text, raw: it as SafeRecord });
    };

    if (Array.isArray(payload)) {
        for (const it of payload) pushIfValid(it);
        return out;
    }

    if (isObject(payload)) {
        const obj = payload as Record<string, unknown>;
        if (Array.isArray(obj.messages)) {
            for (const it of obj.messages) pushIfValid(it);
            return out;
        }
        if (Array.isArray(obj.data)) {
            for (const it of obj.data) pushIfValid(it);
            return out;
        }
        pushIfValid(payload);
    }

    return out;
}

async function sendWablasMessage(
    toPhoneNormalized: string,
    message: string
): Promise<{ ok: true; data: unknown } | { ok: false; error: unknown }> {
    const baseUrl = (process.env.WABLAS_BASE_URL || process.env.WABLAS_URL || "").replace(/\/+$/, "");
    const token = process.env.WABLAS_TOKEN;

    if (!baseUrl || !token) {
        console.error("Wablas env vars missing");
        return { ok: false, error: "Wablas not configured" };
    }

    const url = `${baseUrl}/api/send-message`;
    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ phone: toPhoneNormalized, message }),
    });

    const json: unknown = await res.json().catch(() => ({}));
    if (!res.ok) {
        console.error("Wablas send error", res.status, json);
        return { ok: false, error: json };
    }
    return { ok: true, data: json };
}

// -------- Route Handler --------
export async function POST(req: NextRequest) {
    try {
        const payload = (await req.json().catch(() => ({}))) as unknown;
        const items = extractMessages(payload);

        if (!items.length) {
            return NextResponse.json({ ok: true, message: "No messages to process" });
        }

        const app = initFirebase();
        const db = app.firestore();
        const col = db.collection("alumni_registrations");
        const loginUrl = process.env.APP_LOGIN_URL || "";

        const results: Array<Record<string, unknown>> = [];

        for (const { phone, text } of items) {
            const msg = String(text || "").trim().toLowerCase();
            if (!msg.includes("daftaralumni")) {
                results.push({ phone, handled: false, reason: "keyword_not_found" });
                continue;
            }

            const normalizedPhone = normalizePhone(phone);
            if (!normalizedPhone) {
                results.push({ phone, handled: false, reason: "invalid_phone" });
                continue;
            }

            const docRef = col.doc(normalizedPhone);
            const snap = await docRef.get();

            let password: string;
            if (snap.exists) {
                const data = (snap.data() || {}) as Record<string, unknown>;
                password = isString(data.password) ? data.password : generatePassword();
            } else {
                password = generatePassword();
                await docRef.set(
                    {
                        phoneOriginal: phone,
                        phoneNormalized: normalizedPhone,
                        username: normalizedPhone,
                        password, // hash in production
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    },
                    { merge: true }
                );
            }

            const reply =
                `Akun alumni Anda:\n` +
                `Username: ${normalizedPhone}\n` +
                `Password: ${password}\n` +
                (loginUrl ? `Login: ${loginUrl}\n` : "") +
                `Jaga kerahasiaan akun Anda.`;

            const sendRes = await sendWablasMessage(normalizedPhone, reply);

            await docRef.set(
                {
                    lastSentAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                },
                { merge: true }
            );

            results.push({
                phone: normalizedPhone,
                handled: true,
                sent: sendRes.ok,
            });
        }

        return NextResponse.json({ ok: true, results });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("Webhook error:", message);
        return NextResponse.json({ ok: false, error: message }, { status: 200 });
    }
}

// Optional: quick health check
export async function GET() {
    return NextResponse.json({ ok: true, service: "wablas-webhook" });
}