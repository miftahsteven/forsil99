import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, ref, remove, get } from 'firebase/database';
import { getAuth, deleteUser } from 'firebase/auth';
import { initializeApp } from 'firebase/app';

const app = initializeApp({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
});
const db = getDatabase(app);
const auth = getAuth(app);


export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
    try {

        const { username } = await req.json();
        if (!username) return NextResponse.json({ error: 'username required' }, { status: 400 });
        // hapus di auth
        await remove(ref(db, `auth/${username}`));
        // cari di alumni
        const alumniSnap = await get(ref(db, 'alumni'));
        if (alumniSnap.exists()) {
            const alumniData = alumniSnap.val();
            const entry = Object.entries(alumniData).find(([key, value]) => {
                return (value as { username?: string }).username === username;
            });
            if (entry) {
                const [key] = entry;
                await remove(ref(db, `alumni/${key}`));
                // hapus user di firebase auth
                try {
                    const userRecord = await get(ref(db, `auth/${username}`));
                    if (userRecord.exists()) {
                        const uid = userRecord.val().uid;
                        if (uid) {
                            await deleteUser(auth.currentUser!); // pastikan auth.currentUser ada
                        }
                    }
                } catch {
                    // ignore error if user not found or cannot delete  
                }
            }
        }


        return NextResponse.json({ ok: true });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}