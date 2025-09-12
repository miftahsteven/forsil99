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
        const secretKey = process.env.WABLAS_SECRET_KEY;
        const wablasUrl = process.env.WABLAS_URL || "https://wablas.com/api/";

        if (!token || !secretKey) {
            return NextResponse.json(
                { error: "WABLAS_TOKEN atau WABLAS_SECRET_KEY belum dikonfigurasi" },
                { status: 500 }
            );
        }

        const form = new URLSearchParams();
        form.set("phone", String(body.phone));
        form.set("message", String(body.message));

        const wablasRes = await fetch(`${wablasUrl}send-message`, {
            method: "POST",
            headers: {
                Authorization: `${token}.${secretKey}`,
                "Content-Type": "application/x-www-form-urlencoded",
                Accept: "application/json",
            },
            body: form.toString(),
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