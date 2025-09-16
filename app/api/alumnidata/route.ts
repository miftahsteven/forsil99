import { NextRequest, NextResponse } from "next/server";
import { db } from '../../../firebase/client';
import { ref, get } from 'firebase/database';
// /Users/miftahsyarief/MyLab/forsil99web/app/api/whatsapp/route.ts


export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    try {
        // Early check: is "/alumni" path present?
        const alumniRef = ref(db, 'alumni');
        const snapshot = await get(alumniRef);

        if (!snapshot.exists()) {
            // Path "/alumni" does not exist -> treat as no alumni data
            return NextResponse.json(false);
        } else {
            // cek username apakah sudah ada. Jika sudah ada return false artinya proses nantinya akan menjadi update
            const body = (await req.json()) as { username?: string };
            if (!body?.username) {
                return NextResponse.json(
                    { error: "username wajib diisi" },
                    { status: 400 }
                );
            }

            const alumniData = snapshot.val();
            const found = Object.values(alumniData).some((alumni: unknown) => {
                if (typeof alumni === 'object' && alumni !== null && 'nohp' in alumni) {
                    return (alumni as Record<string, unknown>).nohp === body.username;
                }
                return false;
            });
            //console.log('checking username', body.username);
            //console.log('alumni found', found);
            //return NextResponse.json(found);
            //response jika memang true, maka return object alumni yang ditemukan. Seperti ID, name, email, program, graduationYear, nohp, tanggalLahir, pekerjaan, photoprofile
            if (found) {
                const alumniEntry = Object.entries(alumniData).find(([key, alumni]: [string, unknown]) => {
                    if (typeof alumni === 'object' && alumni !== null && 'nohp' in alumni) {
                        return (alumni as Record<string, unknown>).nohp === body.username;
                    }
                    return false;
                });
                //console.log('alumni entry', alumniEntry);
                //return NextResponse.json(alumniEntry);
                // jika ada, return object alumni yang ditemukan
                if (alumniEntry) {
                    const [key, alumni] = alumniEntry;
                    return NextResponse.json({ id: key, ...(alumni as Record<string, unknown>) });
                }
            }
            return NextResponse.json(false);
        }

        // Alumni path exists
        //return NextResponse.json(true);
    } catch (err: unknown) {
        const message =
            err instanceof Error ? err.message : "Terjadi kesalahan tidak terduga";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}