"use client";
import React, { useState } from 'react';
import { addAlumni, addAuthLogin, addAlumniWithPhoto } from '../lib/alumni';

interface Props {
  onSuccess?: () => void;
}

//const years = Array.from({ length: 40 }, (_, i) => new Date().getFullYear() - i);
//years hanya dari 1998 hingga 2000
const years = Array.from({ length: 3 }, (_, i) => 2000 - i);
//buat array jurusan hanya, IPA, IPS dan Bahasa
const jurusan = ['IPA', 'IPS', 'Bahasa'];

export default function AlumniForm({ onSuccess }: Props) {
  const [form, setForm] = useState({ name: '', email: '', program: '', graduationYear: new Date().getFullYear(), nohp: '', tanggalLahir: '', pekerjaan: '', photoprofile: '' });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: name === 'graduationYear' ? Number(value) : value }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!form.name || !form.email) {
      setMsg("Nama & Email wajib diisi");
      return;
    }
    setLoading(true);

    try {
      //const id = await addAlumni(form);
      // jika ada file foto, upload
      const id = photoFile ? await addAlumniWithPhoto(form, photoFile) : await addAlumni(form);
      // if(photoFile) {
      //   await addAlumniWithPhoto(form, photoFile);
      // }else {
      //   await addAlumni(form);
      // }

      if (id) {
        await addAuthLogin({ username: form.email, role: 'alumni' });
        setMsg("Registrasi berhasil. Cek email untuk informasi login.");
        setForm({ name: '', email: '', program: '', graduationYear: new Date().getFullYear(), nohp: '', tanggalLahir: '', pekerjaan: '', photoprofile: '' });
        onSuccess?.();
      } else {
        setMsg("Gagal menyimpan data alumni.");
      }
    } catch (e: unknown) {
      setMsg("Gagal menyimpan: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 max-w-md">
      <div>
        <label className="block text-sm font-medium">Nama</label>
        <input name="name" value={form.name} onChange={handleChange} className="border w-full p-2 rounded" />
      </div>
      <div>
        <label className="block text-sm font-medium">Email</label>
        <input type="email" name="email" value={form.email} onChange={handleChange} className="border w-full p-2 rounded" />
      </div>
      <div>
        <label className="block text-sm font-medium">Program / Jurusan</label>
        <select name="program" value={form.program} onChange={handleChange} className="border w-full p-2 rounded">
          <option value="">-- Pilih Jurusan --</option>
          {jurusan.map(j => <option key={j} value={j}>{j}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium">Tahun Lulus</label>
        <select name="graduationYear" value={form.graduationYear} onChange={handleChange} className="border w-full p-2 rounded">
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      {/** tambah no handphone atau whatsapp */}
      <div>
        <label className='block text-sm font-medium'>No. Handphone/Whatsapp</label>
        <input type='number' name="nohp" value={form.nohp} onChange={handleChange} className="border w-full p-2 rounded" />
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
        {photoFile && <img src={URL.createObjectURL(photoFile)} alt="Preview" className="mt-2 h-24 w-24 object-cover rounded-full" />}
      </div>
      {/** tombol submit dan batal */}
      <button disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-70">
        {loading ? 'Menyimpan...' : 'Daftar'}
      </button>
      {/** tambahkan tombol batal dan kembali ke halaman list */}
      <button type="button" onClick={() => window.location.href = '/'} className="bg-gray-600 text-white px-4 py-2 rounded ml-2">
        Batal
      </button>
      {msg && <p className="text-sm">{msg}</p>}
    </form>
  );
}