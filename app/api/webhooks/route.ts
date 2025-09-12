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

function extractMessages(payload: any): { phone: string; text: string; raw: AnyObject }[] {
    const out: { phone: string; text: string; raw: AnyObject }[] = [];

    if (Array.isArray(payload)) {
        for (const it of payload) {
            const phone = extractPhone(it);
            const text = extractText(it);
            if (phone && text) out.push({ phone, text, raw: it });
        }
        return out;
    }

    // Common Wablas shapes
    if (payload?.messages && Array.isArray(payload.messages)) {
        for (const it of payload.messages) {
            const phone = extractPhone(it);
            const text = extractText(it);
            if (phone && text) out.push({ phone, text, raw: it });
        }
        return out;
    }

    if (payload?.data && Array.isArray(payload.data)) {
        for (const it of payload.data) {
            const phone = extractPhone(it);
            const text = extractText(it);
            if (phone && text) out.push({ phone, text, raw: it });
        }
        return out;
    }

    // Single object fallback
    if (typeof payload === "object" && payload) {
        const phone = extractPhone(payload);
        const text = extractText(payload);
        if (phone && text) out.push({ phone, text, raw: payload });
    }

    return out;
}

async function sendWablasMessage(toPhoneNormalized: string, message: string) {
    const baseUrl = process.env.WABLAS_BASE_URL; // e.g. https://console.wablas.com or https://kudus.wablas.com
    const token = process.env.WABLAS_TOKEN;

    if (!baseUrl || !token) {
        console.error("Wablas env vars missing");
        return { ok: false, error: "Wablas not configured" };
    }

    const url = `${baseUrl.replace(/\/+$/, "")}/api/send-message`;
    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            phone: toPhoneNormalized,
            message,
        }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
        console.error("Wablas send error", res.status, json);
        return { ok: false, error: json };
    }
    return { ok: true, data: json };
}

// -------- Route Handler --------
export async function POST(req: NextRequest) {
    try {
        const payload = await req.json().catch(() => ({}));
        const items = extractMessages(payload);

        if (!items.length) {
            return NextResponse.json({ ok: true, message: "No messages to process" });
        }

        const app = initFirebase();
        const db = app.firestore();
        const col = db.collection("alumni_registrations");
        const loginUrl = process.env.APP_LOGIN_URL || "";

        const results: AnyObject[] = [];

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
                const data = snap.data() || {};
                password = data.password || generatePassword();
            } else {
                password = generatePassword();
                await docRef.set(
                    {
                        phoneOriginal: phone,
                        phoneNormalized: normalizedPhone,
                        username: normalizedPhone, // username = nomor whatsapp pengirim (distandardisasi)
                        password, // consider hashing in production
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

            // update updatedAt after sending
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
    } catch (err: any) {
        console.error("Webhook error:", err);
        // Always 200 so provider doesn't retry storms, but include error detail
        return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 200 });
    }
}

// Optional: quick health check
export async function GET() {
    return NextResponse.json({ ok: true, service: "wablas-webhook" });
}