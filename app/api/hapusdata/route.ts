import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, ref, remove, get } from 'firebase/database';
import { getAuth, deleteUser } from 'firebase/auth';
import { initializeApp } from 'firebase/app';


// Firebase config
const firebaseConfig = {
    // isi dengan konfigurasi Firebase Anda
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.FIREBASE_DB_URL,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

export async function POST(req: NextRequest) {
    try {
        const { uid } = await req.json();
        console.log('Deleting user with UID:', uid);
        if (!uid) {
            return NextResponse.json({ error: 'UID diperlukan' }, { status: 400 });
        }
        const userRef = ref(db, `auth/${uid}`);
        await remove(userRef);
        console.log(`Data di /auth/${uid} telah dihapus.`);
        // query daya di /alumni dengan nohp = uid
        const alumniRef = ref(db, 'alumni');
        // karena tidak bisa query langsung berdasarkan nohp, maka kita harus mengambil semua data alumni
        // dan mencari yang nohp-nya sesuai dengan uid        
        const snapshot = await get(alumniRef);
        let alumniKey = null;
        snapshot.forEach((childSnapshot) => {
            const childData = childSnapshot.val();
            if (childData.nohp === uid) {
                alumniKey = childSnapshot.key;
            }
        });
        if (alumniKey) {
            const specificAlumniRef = ref(db, `alumni/${alumniKey}`);
            await remove(specificAlumniRef);
            console.log(`Data di /alumni/${alumniKey} telah dihapus.`);
        } else {
            console.log(`Tidak ditemukan data alumni dengan nohp: ${uid}`);
        }

        //respon dari auth
        const user = auth.currentUser;
        if (user && user.uid === uid) {
            await deleteUser(user);
            console.log(`User dengan UID: ${uid} telah dihapus dari Firebase Auth.`);
        } else {
            console.log(`Tidak ada user yang sedang login atau UID tidak cocok. User saat ini: ${user ? user.uid : 'null'}`);
        }

        return NextResponse.json({ message: 'Data dan user berhasil dihapus' });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Error menghapus data atau user:', message);
        return NextResponse.json({ error: 'Gagal menghapus data atau user: ' + message }, { status: 500 });
    }
}