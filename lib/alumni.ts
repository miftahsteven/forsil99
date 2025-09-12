import { db } from '../firebase/client';
import { ref, push, serverTimestamp, DataSnapshot, update } from 'firebase/database';
//import md5 from 'md5'; //gunakan md5 dari npm
import md5 from 'blueimp-md5';


export interface Alumni {
  id?: string;
  name: string;
  email: string;
  program: string;
  graduationYear: number;
  nohp: string;
  tanggalLahir: string;
  pekerjaan: string;
  createdAt?: number;
}

export async function addAlumni(data: Omit<Alumni, 'id' | 'createdAt'>) {
  const alumniRef = ref(db, 'alumni');
  const newRef = await push(alumniRef, {
    ...data,
    createdAt: Date.now(), // atau serverTimestamp() (Realtime DB menaruh {".sv":"timestamp"})
  });

  return newRef.key;
}

async function uploadProfilePhoto(firebaseId: string, file: File) {
  const fd = new FormData();
  fd.append('id', firebaseId);
  fd.append('file', file);
  const res = await fetch('/api/upload-profile', { method: 'POST', body: fd });
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.url; // simpan ke node alumni sebagai photoUrl
}

export async function addAlumniWithPhoto(
  data: Omit<Alumni, 'id' | 'createdAt'>,
  file?: File
) {
  const alumniRef = ref(db, 'alumni');
  const newRef = await push(alumniRef, {
    ...data,
    createdAt: Date.now(),
  });

  if (file) {
    try {
      const fd = new FormData();
      fd.append('id', newRef.key as string);
      fd.append('file', file);
      const resp = await fetch('/api/upload-profile', { method: 'POST', body: fd });
      const json = await resp.json();
      if (json.success) {
        await update(ref(db, `alumni/${newRef.key}`), { photoUrl: json.url });
      } else {
        console.warn('Upload profile failed:', json.error);
      }
    } catch (e: any) {
      console.warn('Upload profile error:', e.message);
    }
  }

  return newRef.key;
}

export async function addAuthLogin(data: { username: string; password?: string; role?: string; }) {
  const authRef = ref(db, 'auth');
  //create password random 6 digit
  //data = { ...data, password: Math.floor(100000 + Math.random() * 900000).toString() };
  //data password di md5
  if (!data.password) {
    data = { ...data, password: Math.floor(100000 + Math.random() * 900000).toString() };
  }
  const encryptedPassword = md5(String(data.password));
  const realPassword = data.password;
  data = { ...data, password: encryptedPassword }; //ganti dengan md5(data.password) jika perlu

  const newRef = await push(authRef, {
    ...data,
    createdAt: Date.now(), // atau serverTimestamp() (Realtime DB menaruh {".sv":"timestamp"})
  });

  try {
    await fetch('/api/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: data.username,
        html: `<p>Terima kasih telah mendaftar sebagai alumni.</p>
               <p>Berikut informasi login Anda:</p>
               <ul>
                 <li>Username: ${data.username}</li>
                 <li>Password: ${realPassword}</li>
               </ul>
               <p>Silakan login dan ubah password Anda setelah masuk.</p>`,
        text: `Terima kasih telah mendaftar sebagai alumni.\n\nBerikut informasi login Anda:\n- Username: ${data.username}\n- Password: ${data.password}\n\nSilakan login dan ubah password Anda setelah masuk.`,
        subject: 'Registrasi Alumni',

      })
    });
  } catch (e) {
    console.warn('Send email failed', (e as any).message);
  }

  return newRef.key;
}

export function mapSnapshot(snapshot: DataSnapshot): Alumni[] {
  const val = snapshot.val();
  if (!val) return [];
  return Object.entries<any>(val)
    .map(([key, v]) => ({ id: key, ...v }))
    .sort((a, b) => b.createdAt - a.createdAt);
}