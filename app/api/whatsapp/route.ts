import { NextRequest, NextResponse } from "next/server";
// /Users/miftahsyarief/MyLab/forsil99web/app/api/whatsapp/route.ts

// Pastikan env sudah diset:
// WABLAS_TOKEN=... 
// WABLAS_SECRET_KEY=...

export const runtime = "nodejs";

type SendPayload = {
    phone: string;
    message: string;
};

function normalizePhone(raw: string): string {
    const d = String(raw || '').replace(/\D+/g, '');
    if (!d) return '';
    if (d.startsWith('62')) return d;
    if (d.startsWith('0')) return '62' + d.slice(1);
    if (d.startsWith('8')) return '62' + d;
    return d;
}

export async function POST(req: NextRequest) {
    try {
        const body = (await req.json()) as Partial<SendPayload>;

        if (!body?.phone || !body?.message) {
            return NextResponse.json(
                { error: "phone dan message wajib diisi" },
                { status: 400 }
            );
        }

        const token = process.env.WABLAS_TOKEN;
        const secretKey = process.env.WABLAS_SECRET;
        const wablasUrl = process.env.WABLAS_URL || "https://sby.wablas.com/api/";

        if (!token || !secretKey) {
            return NextResponse.json(
                { error: "WABLAS_TOKEN atau WABLAS_SECRET_KEY belum dikonfigurasi" },
                { status: 500 }
            );
        }

        const messageClean = String(body.message || '').replace(/\r\n/g, '\n').trim();

        const bodyMessage = new URLSearchParams({
            phone: normalizePhone(body.phone),
            message: messageClean,
        }).toString();


        const wablasRes = await fetch(`${wablasUrl}send-message`, {
            method: "POST",
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept: 'application/json',
                Authorization: secretKey ? `${token}.${secretKey}` : token,
            },
            body: bodyMessage,
        });

        const text = await wablasRes.text();
        let data: unknown;
        try {
            data = JSON.parse(text);
        } catch {
            data = { raw: text };
        }

        if (!wablasRes.ok) {
            return NextResponse.json(
                { error: "Gagal mengirim pesan", details: data },
                { status: wablasRes.status }
            );
        }

        return NextResponse.json({ success: true, data });
    } catch (err: unknown) {
        const message =
            err instanceof Error ? err.message : "Terjadi kesalahan tidak terduga";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}