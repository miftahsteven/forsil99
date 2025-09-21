"use client";
import React, { useState, useRef } from 'react';
import { addAlumni, addAuthLogin, addAlumniWithPhoto, updateAlumni } from '../lib/alumni';
import Modal from './Modal';
import { get } from 'http';
import { useRouter } from 'next/navigation';

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
  alamat?: string;
  createdAt?: number;
  nomorAlumni?: string;
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
//buat array pekerjaan/profesi yang akan dikonversi ke select option di form pekerjaan
const profesi = ['PNS', 'Polisi/TNI', 'Karyawan Swasta', 'Wiraswasta', 'Profesional/Ahli', 'Tidak Bekerja', 'Lainnya',];

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

const getAlumniNumber = async (): Promise<string | null> => {
  try {
    const res = await fetch('/api/alumninumber', { method: 'POST' });
    if (!res.ok) {
      //console.error("Gagal mendapatkan nomor induk:", res.statusText);
      return null;
    }
    const data: unknown = await res.json();
    if (isObject(data) && 'newId' in data && typeof data.newId === 'number') {
      console.log('newId', data.newId);

      return String(data.newId).padStart(4, '0');
    }
    return null;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("Error fetching alumni number:", message);
    return null;
  }
}

export default function AlumniForm({ onSuccess }: Props) {
  const [showModal, setShowModal] = useState(false);

  const [alumniNumber, setAlumniNumber] = useState<string | null>(null);

  const didFetch = useRef(false);
  const r = useRouter();

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
          photoUrl: data.photoUrl || '',
          twodigityears: data.tanggalLahir ? String(data.tanggalLahir).slice(-2) : '',
          typejurusan: data.program === 'IPA' ? '1' : data.program === 'IPS' ? '2' : data.program === 'Bahasa' ? '3' : '0',
          nomorAlumni: data.nomorAlumni || '',
          alamat: data.alamat || '',
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
      nohp: //ambil dari username yang login
        getLoggedInUsername() || '',
      tanggalLahir: '',
      pekerjaan: '',
      photoprofile: '',
      photoUrl: '',
      twodigityears: '',
      typejurusan: '',
      alamat: ''
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
      console.log('cekRes', cekRes, data);


      if (data && typeof data === 'object' && 'name' in data) {


        //jika ada, maka update data alumni
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
        //panggil getAlumniNumber untuk mendapatkan nomor induk
        let newAlumniNumber = alumniNumber;
        if (!newAlumniNumber) {
          newAlumniNumber = await getAlumniNumber();
          if (!newAlumniNumber) {
            setMsg("Gagal mendapatkan nomor induk alumni.");
            setLoading(false);
            return;
          }
          setAlumniNumber(newAlumniNumber);
        }

        //const induk1 = form.tanggalLahir ? String(form.tanggalLahir).slice(-2) : '';
        //tanggallahir formatnya YYYY-MM-DD, maka ambil 2 digit terakhir dari tahun
        const induk1 = form.tanggalLahir ? String(form.tanggalLahir).slice(2, 4) : '';
        const induk2 = form.program === 'IPA' ? 'A' : form.program === 'IPS' ? 'S' : form.program === 'Bahasa' ? 'B' : '0';
        form.id = induk1 + induk2 + newAlumniNumber;
        //jika tidak ada, maka simpan data alumni baru

        const id = photoFile ? await addAlumniWithPhoto(form.id, form, photoFile) : await addAlumni(form);
        console.log('id baru', id);
        if (id) {
          //await addAuthLogin({ username: form.email, role: 'alumni' });
          //kirim wha
          setMsg("Registrasi berhasil. Terima kasih telah mendaftar sebagai alumni. Selalu lakukan update data Anda jika ada perubahan.");
          setForm({ id: '', name: '', email: '', program: '', graduationYear: new Date().getFullYear(), nohp: '', tanggalLahir: '', pekerjaan: '', photoprofile: '', photoUrl: '', twodigityears: '', typejurusan: '', alamat: '' });
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

      //langsung menuju halaman home
      setMsg("Berhasil update data alumni.");
      r.push('/home');

    } catch (e: unknown) {
      //setMsg("Gagal menyimpan: " + e.message);
      const message = e instanceof Error ? e.message : String(e);
      setMsg("Gagal menyimpan: " + message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={submit} className="space-y-4 max-w-md">
        {/** tampilkan alumniNumber apabila ada */}
        {form.id && (
          <div>
            <label className="block text-sm font-medium">Nomor Induk Alumni</label>
            <input type="text" value={form.id} className="border w-full p-2 rounded bg-gray-100" readOnly />
          </div>
        )}
        {/** jika alumniNumber belum ada, tampilkan tombol generate */}
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
          {/* <input type="date" name="tanggalLahir" value={form.tanggalLahir} onChange={handleChange} className="border w-full p-2 rounded" /> */}
          {/** input date dibatasi tahunnya dari 1975 - 1985 */}
          <input type="date" name="tanggalLahir" value={form.tanggalLahir} onChange={handleChange} className="border w-full p-2 rounded" min="1975-01-01" max="1985-12-31" />
        </div>
        {/** tambah pekerjaan */}
        <div>
          <label className='block text-sm font-medium'>Pekerjaan/Profesi</label>
          {/* <input name="pekerjaan" value={form.pekerjaan} onChange={handleChange} className="border w-full p-2 rounded" /> */}
          <select name="pekerjaan" value={form.pekerjaan} onChange={handleChange} className="border w-full p-2 rounded">
            <option value="">-- Pilih Pekerjaan/Profesi --</option>
            {profesi.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className='block text-sm font-medium'>Alamat Rumah (Surat Menyurat)</label>
          <input name="alamat" value={form.alamat} onChange={handleChange} className="border w-full p-2 rounded" />
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
        {
          /** tambahkan checklist checkbox dan ada keterangan "Saya menyetujui .... [link pernyataab]" untuk awareness terhadap peraturan perlindungan data pribadi*/
          <div>
            <label className="inline-flex items-center">
              <input type="checkbox" required className="form-checkbox" />
              <span className="ml-2 text-sm">Saya menyetujui <a href="#pdpModal" onClick={(e) => { e.preventDefault(); setShowModal(true); }} className="mt-4 text-sm text-blue-600 underline">Pernyataan Perlindungan Data Pribadi</a> (Wajib)</span>
            </label>
          </div>
        }
        {/** tambahkan tombol batal dan kembali ke halaman list */}
        <button type="button" onClick={() => window.location.href = '/home'} className="bg-gray-600 text-white px-4 py-2 rounded">
          Batal
        </button>
        {/** jika checkbox pernyataan belum di checked, maka tombol simpan disabled dan berwarna beda */}
        <button type="submit" disabled={loading} className={`px-4 py-2 rounded text-white ml-2 ${loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}>
          {loading ? 'Menyimpan...' : 'Simpan'}
        </button>

        {msg && <p className="text-sm">{msg}</p>}
      </form>
      <div>
        {/** buatkan tampilan popup atau modal untuk mengeluarkan informasi tentang checklist PDP
      1. Saya memahami bahwa data saya akan disimpan di database sistem alumni.
      2. Data ini hanya digunakan untuk keperluan administrasi dan pengelolaan database alumni, bukan untuk tujuan komersial tanpa izin saya.
      3. Saya mengetahui bahwa password dan data penting saya disimpan secara terenkripsi demi menjaga keamanan.
      4. Saya menyadari bahwa sesuai UU Perlindungan Data Pribadi di Indonesia, saya berhak mengakses, memperbarui, atau menghapus data saya kapan saja.
      5. Saya menyetujui penggunaan data ini sesuai dengan ketentuan perlindungan data pribadi yang berlaku.
      */}
        {/* Modal */}
        {/* PDP Modal */}
        {showModal && (
          <Modal open={showModal} onClose={() => setShowModal(false)} title="Pernyataan Perlindungan Data Pribadi">
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>Saya memahami bahwa data saya akan disimpan di database sistem alumni.</li>
              <li>Data ini hanya digunakan untuk keperluan administrasi dan pengelolaan database alumni, bukan untuk tujuan komersial tanpa izin saya.</li>
              <li>Saya mengetahui bahwa password dan data penting saya disimpan secara terenkripsi demi keamanan.</li>
              <li>Saya menyadari bahwa saya berhak mengakses, memperbarui, atau menghapus data saya kapan saja.</li>
              <li>Saya menyetujui penggunaan data sesuai ketentuan yang berlaku.</li>
            </ul>
            <button
              onClick={() => setShowModal(false)}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded"
            >
              Tutup
            </button>
          </Modal>
        )}

      </div>
    </>
  );
}