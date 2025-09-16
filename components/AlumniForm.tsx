"use client";
import React, { useState, useRef } from 'react';
import { addAlumni, addAuthLogin, addAlumniWithPhoto, updateAlumni } from '../lib/alumni';


interface Props {
  onSuccess?: () => void;
}

type AlumniData = {
  id?: string;
  name?: string;
  email?: string;
  program?: string;
  graduationYear?: number;
  nohp?: string;
  tanggalLahir?: string;
  pekerjaan?: string;
  photoprofile?: string;
  photoUrl?: string;
};

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}
function isAlumniData(v: unknown): v is AlumniData {
  return isObject(v) && ('name' in v || 'email' in v || 'program' in v);
}

//const years = Array.from({ length: 40 }, (_, i) => new Date().getFullYear() - i);
//years hanya dari 1998 hingga 2000
const years = Array.from({ length: 3 }, (_, i) => 2000 - i);
//buat array jurusan hanya, IPA, IPS dan Bahasa
const jurusan = ['IPA', 'IPS', 'Bahasa'];

const getLoggedInUsername = (): string => {
  //ambil username dari proses createSessionResponse saat login
  if (typeof window === 'undefined') return '';
  const match = document.cookie.match(new RegExp('(^| )username=([^;]+)'));
  console.log('match', match);
  return match ? decodeURIComponent(match[2]) : '';
}

const getDataAlumniByUsername = async (): Promise<AlumniData | null> => {
  const username = getLoggedInUsername();
  if (!username) return null;

  try {
    const res = await fetch('/api/alumnidata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });
    if (!res.ok) {
      console.error("Gagal mengambil data alumni:", res.statusText);
      return null;
    }
    const data: unknown = await res.json();
    return isAlumniData(data) ? data : null;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("Error fetching alumni data:", message);
    return null;
  }
}

export default function AlumniForm({ onSuccess }: Props) {

  //ambil data alumni berdasarkan username yang login
  //const existingData = getDataAlumniByUsername();

  //keluarkan form.name dari existingData jika ada
  // React.useEffect(() => {
  //   existingData.then(data => {
  //     if (data && typeof data === 'object' && 'name' in data) {
  //       setForm(f => ({
  //         ...f,
  //         name: data.name || '',
  //         email: data.email || '',
  //         program: data.program || '',
  //         graduationYear: data.graduationYear || new Date().getFullYear(),
  //         nohp: data.nohp || '',
  //         tanggalLahir: data.tanggalLahir || '',
  //         pekerjaan: data.pekerjaan || '',
  //         photoprofile: data.photoprofile || ''
  //       }));
  //     }
  //   });
  // }, [existingData]);

  const didFetch = useRef(false);

  React.useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;

    getDataAlumniByUsername().then(data => {
      if (data && typeof data === 'object' && 'name' in data) {
        setForm(f => ({
          ...f,
          id: data.id || '',
          name: data.name || '',
          email: data.email || '',
          program: data.program || '',
          graduationYear: data.graduationYear || new Date().getFullYear(),
          nohp: data.nohp || '',
          tanggalLahir: data.tanggalLahir || '',
          pekerjaan: data.pekerjaan || '',
          photoprofile: data.photoprofile || '',
          photoUrl: data.photoUrl || ''
        }));
      }
    });
  }, []);


  const [form, setForm] = useState(
    {
      id: '',
      name: '',
      email: '',
      program: '',
      graduationYear: 1999,
      nohp: '',
      tanggalLahir: '',
      pekerjaan: '',
      photoprofile: '',
      photoUrl: ''
    });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    //setForm(f => ({ ...f, [name]: name === 'graduationYear' ? Number(value) : value }));
    //setform Number untuk graduationYear dan apabila graduationYear kosong maka diisi tahun 1999
    setForm(f => ({ ...f, [name]: name === 'graduationYear' ? (value ? Number(value) : 1999) : value }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!form.name || !form.program || !form.tanggalLahir) {
      setMsg("Nama dan Tanggal Lahir wajib diisi");
      return;
    }
    setLoading(true);

    try {
      //cek apakah nomor handphone sudah ada di database firebase
      const nomorhandphone = form.nohp;
      const cekRes = await fetch('/api/alumnidata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: nomorhandphone })
      });
      const data = await cekRes.json();
      //jika ada, maka update data alumni

      if (data && typeof data === 'object' && 'id' in data) {
        //update data alumni
        console.log('data alumni ditemukan', data);

        const existingid = data.id;
        const existingId = typeof existingid === 'string' ? existingid : null;
        if (!existingId) {
          throw new Error('Data alumni tidak memiliki ID');
        }
        //await updateAlumni(existingId, form);
        await updateAlumni(existingId, photoFile ? { ...form, photoFile } : form);

        setMsg("Data alumni berhasil diperbarui.");
        onSuccess?.();

      } else {

        const id = photoFile ? await addAlumniWithPhoto(form, photoFile) : await addAlumni(form);
        if (id) {
          //await addAuthLogin({ username: form.email, role: 'alumni' });
          //kirim wha
          setMsg("Registrasi berhasil. Cek email untuk informasi login.");
          setForm({ id: '', name: '', email: '', program: '', graduationYear: new Date().getFullYear(), nohp: '', tanggalLahir: '', pekerjaan: '', photoprofile: '', photoUrl: '' });
          onSuccess?.();
        } else {
          setMsg("Gagal menyimpan data alumni.");
        }
      }


      try {
        await fetch('/api/send-whatsapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: nomorhandphone,
            message: `Halo ${form.name}, data alumni Anda telah berhasil diperbarui. Terima kasih telah memperbarui informasi Anda di sistem kami.`
          })
        });
      } catch (e) {
        console.error("Gagal mengirim WhatsApp:", e);
      }

    } catch (e: unknown) {
      //setMsg("Gagal menyimpan: " + e.message);
      const message = e instanceof Error ? e.message : String(e);
      setMsg("Gagal menyimpans: " + message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 max-w-md">
      <div>
        <label className="block text-sm font-medium">Nama (Wajib)</label>
        <input name="name" value={form.name} onChange={handleChange} className="border w-full p-2 rounded" />
      </div>
      <div>
        <label className="block text-sm font-medium">Email</label>
        <input type="email" name="email" value={form.email} onChange={handleChange} className="border w-full p-2 rounded" />
      </div>
      <div>
        <label className="block text-sm font-medium">Program / Jurusan (Wajib)</label>
        <select name="program" value={form.program} onChange={handleChange} className="border w-full p-2 rounded">
          <option value="">-- Pilih Jurusan --</option>
          {jurusan.map(j => <option key={j} value={j}>{j}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium">Tahun Lulus</label>
        <select name="graduationYear" value={form.graduationYear} onChange={handleChange} className="border w-full p-2 rounded">
          <option value="">-- Pilih Tahun Lulus --</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      {/** tambah no handphone atau whatsapp */}
      <div>
        <label className='block text-sm font-medium'>No. Handphone/Whatsapp</label>
        <input type='number' name="nohp" value={form.nohp} onChange={handleChange} className="border w-full p-2 rounded" disabled />
      </div>
      {/** tambah tanggal lahir, agar alumni diberi ucapan ultah */}
      <div>
        <label className='block text-sm font-medium'>Tanggal Lahir</label>
        {/** input mengeluarkan calendar, dan melihat data tahun 1990 kebawah */}
        <input type="date" name="tanggalLahir" value={form.tanggalLahir} onChange={handleChange} className="border w-full p-2 rounded" />
      </div>
      {/** tambah pekerjaan */}
      <div>
        <label className='block text-sm font-medium'>Pekerjaan</label>
        <input name="pekerjaan" value={form.pekerjaan} onChange={handleChange} className="border w-full p-2 rounded" />
      </div>
      {/** tambahkan upload gambar (jpg, png) untuk profil picture. Upload ke area asset/image */}
      <div>
        <label className='block text-sm font-medium'>Foto Profil</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const f = e.target.files?.[0];
            setPhotoFile(f || null);
          }}
          className="border p-2 w-full rounded"
        />
        {
          form.photoUrl && !photoFile && (
            <div className="mt-2">
              <img src={form.photoUrl} alt="Foto Profil" className="h-24 w-24 object-cover rounded-full" />
            </div>
          )
        }

        {
          photoFile && (
            <div className="mt-2">
              <img src={URL.createObjectURL(photoFile)} alt="Preview Foto Profil" className="h-24 w-24 object-cover rounded-full" />
            </div>
          )
        }

      </div>
      {/** tombol submit dan batal */}
      <button disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-70">
        {loading ? 'Menyimpan...' : 'Daftar'}
      </button>
      {/** tambahkan tombol batal dan kembali ke halaman list */}
      <button type="button" onClick={() => window.location.href = '/home'} className="bg-gray-600 text-white px-4 py-2 rounded ml-2">
        Batal
      </button>
      {msg && <p className="text-sm">{msg}</p>}
    </form>
  );
}