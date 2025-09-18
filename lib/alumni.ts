import { db } from '../firebase/client';
import { ref, push, serverTimestamp, DataSnapshot, update, set } from 'firebase/database';
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
  photoUrl?: string; // tambahkan properti photoUrl
  createdAt?: number;
  nomorAlumni?: string; // tambahkan properti nomorAlumni
  alamat?: string; // tambahkan properti alamat
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}
function isString(v: unknown): v is string {
  return typeof v === 'string';
}
function isNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function coerceAlumni(id: string, v: unknown): Alumni | null {
  if (!isRecord(v)) return null;
  const name = isString(v.name) ? v.name : '';
  const email = isString(v.email) ? v.email : '';
  const program = isString(v.program) ? v.program : '';
  const graduationYear = isNumber(v.graduationYear)
    ? v.graduationYear
    : Number(v.graduationYear ?? 0);
  const nohp = isString(v.nohp) ? v.nohp : '';
  const tanggalLahir = isString(v.tanggalLahir) ? v.tanggalLahir : '';
  const pekerjaan = isString(v.pekerjaan) ? v.pekerjaan : '';
  const createdAt = isNumber(v.createdAt) ? v.createdAt : undefined;
  const photoUrl = isString(v.photoUrl) ? v.photoUrl : undefined;
  const nomorAlumni = isString(v.id) ? v.id : undefined;
  const alamat = isString(v.alamat) ? v.alamat : undefined;

  return {
    id,
    name,
    email,
    program,
    graduationYear,
    nohp,
    tanggalLahir,
    pekerjaan,
    photoUrl,
    createdAt,
    nomorAlumni,
    alamat,
  };
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
  id: string,
  data: Omit<Alumni, 'id' | 'createdAt' | 'photoUrl'>,
  file?: File
) {

  const pathRef = ref(db, `alumni/${id}`);

  // Upload foto dulu (jika ada), lalu simpan record lengkap dengan set (tanpa push key)
  let photoUrl: string | undefined;
  if (file) {
    try {
      photoUrl = await uploadProfilePhoto(id, file);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn('Upload profile failed:', message);
    }
  }

  await set(pathRef, {
    ...data,
    photoUrl,
    // simpan juga nomorAlumni = id jika ingin disalin ke field
    nomorAlumni: id,
    createdAt: Date.now(), // atau serverTimestamp()
  });

  // kembalikan id custom sebagai "key"
  return id;

}

// tambah update user jika user sudah ada
export async function updateAlumni(id: string, data: Partial<Alumni> & { photoFile?: File; }) {

  const alumniRef = ref(db, `alumni/${id}`);
  //update data alumni existing termasuk photo profile jika ada
  if (data.photoFile) {
    //update data photo profile dan upload foto ke folder public/profiles
    const photoUrl = await uploadProfilePhoto(id, data.photoFile);
    data = { ...data, photoUrl };
    delete data.photoFile;
  }
  await update(alumniRef, data);
  return true;
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
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.warn('Send email failed', message);
  }

  return newRef.key;
}

export function mapSnapshot(snapshot: DataSnapshot): Alumni[] {
  const valUnknown = snapshot.val() as unknown;
  if (!isRecord(valUnknown)) return [];

  const entries = Object.entries(valUnknown as Record<string, unknown>);
  const list = entries
    .map(([key, value]) => coerceAlumni(key, value))
    .filter((x): x is Alumni => x !== null)
    .sort(
      (a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)
    );

  return list;
}