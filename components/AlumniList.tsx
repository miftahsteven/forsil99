"use client";
import React, { useEffect, useState } from 'react';
import { db } from '../firebase/client';
import { ref, onValue, off, DataSnapshot } from 'firebase/database';
import { mapSnapshot, Alumni } from '../lib/alumni';
import Modal from './Modal';
import Image from 'next/image';
import QRCode from 'react-qr-code';
import QRWithLogo from './QRWithLogo';

interface AlumniWithPhoto extends Alumni {
  photoUrl?: string; // tambahkan properti photoUrl
}

const jurusanOptions = ["IPA", "IPS", "BAHASA"]

export default function AlumniList() {
  const [alumni, setAlumni] = useState<AlumniWithPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [labeljumlah, setLabeljumlah] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<AlumniWithPhoto | null>(null);
  const [keyword, setKeyword] = useState('');

  interface AlumniWithPhoto extends Alumni {
    photoUrl?: string;
    photoUpdatedAt?: number | string; // isi dari server saat upload foto
  }

  // const resolvePhotoUrl = (photoUrl?: string) => {
  //   if (!photoUrl) return undefined;
  //   const url = String(photoUrl).trim();
  //   if (/^(https?:|data:|blob:)/i.test(url)) return url;
  //   if (/^\/?profiles\//i.test(url)) return `/${url.replace(/^\/+/, '')}`;
  //   return url.startsWith('/') ? url : `/${url}`;
  // };

  const resolvePhotoUrl = (photoUrl?: string) => {
    if (!photoUrl) return undefined;
    const url = String(photoUrl).trim();
    if (/^(https?:|data:|blob:)/i.test(url)) return url;
    if (/^\/?profiles\//i.test(url)) return `/${url.replace(/^\/+/, '')}`;
    return url.startsWith('/') ? url : `/${url}`;
  };

  const withVersion = (url: string, v?: string | number): string => {
    // pastikan selalu return string agar cocok dengan <Image src=...>
    if (!url) return '';
    const sep = url.includes('?') ? '&' : '?';
    return v ? `${url}${sep}v=${encodeURIComponent(String(v))}` : url;
  };

  // Buat daftar kandidat URL dengan variasi ekstensi dan case
  const buildImageCandidates = (src: string) => {
    const u = new URL(src, typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
    const q = u.search; const h = u.hash;
    const m = u.pathname.match(/^(.+)\.([^.]+)$/);
    const base = m ? m[1] : u.pathname;
    const ext = (m ? m[2] : '').toLowerCase();

    const preferred = ext ? [ext] : [];
    const all = ['jpg', 'jpeg', 'png', 'webp'].filter(e => !preferred.includes(e));
    const pool = [...preferred, ...all];

    const variants: string[] = [];
    for (const e of pool) {
      variants.push(`${base}.${e}`);         // lowercase
      variants.push(`${base}.${e.toUpperCase()}`); // UPPERCASE
    }
    // kembalikan dengan query/hash asli, relatif ke origin
    return Array.from(new Set(variants.map(p => (p + q + h))));
  };

  const tryNextCandidate = (img: HTMLImageElement) => {
    const current = img.getAttribute('src') || '';
    const list = img.dataset.candidates ? JSON.parse(img.dataset.candidates) as string[] : buildImageCandidates(current);
    img.dataset.candidates = JSON.stringify(list);
    const idx = Number(img.dataset.candIndex || '0');

    if (idx >= list.length - 1) return false;
    img.dataset.candIndex = String(idx + 1);
    img.src = list[idx + 1];
    return true;
  };

  useEffect(() => {
    const r = ref(db, 'alumni');
    const unsubscribe = onValue(
      r,
      (snap: DataSnapshot) => {
        {/** limit alumni cukup 50 paling teratas */ }
        setAlumni(mapSnapshot(snap).slice(0, 50));
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsubscribe(); // gunakan unsubscribe, bukan off
  }, []);

  if (loading) return <p>Memuat data...</p>;
  //if (!alumni.length) return <p>Belum ada alumni terdaftar.</p>;

  return (
    <div className="space-y-3">
      {/** buatkan input search dan mengambil data dari nama alumni. metode pencarian melihat nama dari keyword yang diketikan*/}
      {/** buatkan input search dan select jurusan bersebelahan rownya. */}
      <div className="grid grid-cols-2 gap-2">
        <div className="text-sm text-gray-600 mb-2">
          <select className="p-2 border rounded w-full" onChange={e => {
            const jurusan = e.target.value;
            setLoading(true);
            const r = ref(db, 'alumni');
            onValue(
              r,
              (snap: DataSnapshot) => {
                //const allAlumni = mapSnapshot(snap);
                //jika keyword ada, maka filter tetap ditambah berdasarkan keyword.
                const allAlumni = mapSnapshot(snap).filter(a => a.name.toLowerCase().includes(keyword.toLowerCase()));
                const filtered = jurusan === '' ? allAlumni : allAlumni.filter(a => (a.program || '').toUpperCase() === jurusan);
                setAlumni(filtered);
                setLabeljumlah(
                  filtered.length
                    ? `Ditemukan ${filtered.length} alumni dengan jurusan "${jurusan || 'Semua'}"`
                    : `Tidak ada alumni dengan jurusan "${jurusan}"`
                );
                setLoading(false);
              },
              () => setLoading(false)
            );
          }}>
            <option value="">Semua Jurusan</option>
            {jurusanOptions.map(j => (
              <option key={j} value={j}>{j}</option>
            ))}
          </select>
        </div>
        {/** tambahkan select box pilihan jurusan disini */}
        <div className="text-sm text-gray-600 ">
          <input
            type="text"
            placeholder="Cari alumni berdasarkan nama..."
            className="w-full p-2 border rounded"
            onChange={e => {
              const keyword = e.target.value.toLowerCase();
              setKeyword(keyword);
              setLoading(true);
              const r = ref(db, 'alumni');
              onValue(
                r,
                (snap: DataSnapshot) => {
                  //const allAlumni = mapSnapshot(snap);
                  //jika jurusan ada, maka filter tetap ditambah berdasarkan jurusan.
                  const allAlumni = mapSnapshot(snap).filter(a => {
                    const currentJurusan = (a.program || '').toUpperCase();
                    return (currentJurusan === (document.querySelector('select')?.value || '').toUpperCase() || document.querySelector('select')?.value === '');
                  });
                  const filtered = allAlumni.filter(a =>
                    a.name.toLowerCase().includes(keyword)
                  );
                  setAlumni(filtered);
                  setLabeljumlah(
                    filtered.length
                      ? `Ditemukan ${filtered.length} alumni dengan nama mengandung "${keyword}"`
                      : `Tidak ada alumni dengan nama mengandung "${keyword}"`
                  );
                  setLoading(false);
                },
                () => setLoading(false)
              );
            }}
          />
        </div>
      </div>

      {loading && <p>Memuat data...</p>}
      {/** tambahkan urutan huruf sebagai pagination huruf awal dari nama alumni */}
      {/** contoh: A, B, C, D, dst. jika diklik, maka filter alumni yang namanya diawali huruf tersebut */}
      {/** jika tidak ada alumni yang namanya diawali huruf tersebut, maka tampilkan pesan "Tidak ada alumni dengan nama awal {huruf}" */}
      <div className="flex space-x-2 overflow-x-auto mb-4">
        <button
          className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 flex-shrink-0"
          onClick={() => {
            // reset ke semua alumni
            setLoading(true);
            const r = ref(db, 'alumni');
            onValue(
              r,
              (snap: DataSnapshot) => {
                setAlumni(mapSnapshot(snap));
                setLoading(false);
                setLabeljumlah('');
              },
              () => setLoading(false)
            );
          }}
        >
          Semua
        </button>
        {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(letter => (
          <button
            key={letter}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 flex-shrink-0"
            onClick={() => {
              setLoading(true);
              const r = ref(db, 'alumni');
              onValue(
                r,
                (snap: DataSnapshot) => {
                  const allAlumni = mapSnapshot(snap);
                  const filtered = allAlumni.filter(a =>
                    a.name.toUpperCase().startsWith(letter)
                  );
                  setAlumni(filtered);
                  setLabeljumlah(
                    filtered.length
                      ? `Jumlah alumni dengan nama awal ${letter}: ${filtered.length}`
                      : `Data Kosong`
                  );
                  setLoading(false);
                },
                () => setLoading(false)
              );
            }}
          >
            {letter}
          </button>
        ))}
      </div>

      {/** tampilkan list alumni dalam bentuk grid 2 kolom pada layar kecil, 3 kolom pada layar sedang, dan 4 kolom pada layar besar */}

      {alumni.map(a => (
        <button
          key={a.id ?? a.nomorAlumni ?? a.name}
          type="button"
          onClick={() => { setSelected(a); setShowModal(true); }}
          className="mt-4 text-left text-sm text-black-600 w-full">
          <div key={a.id} className="border rounded p-3">
            {/** munculkan foto dari photoUrl di section ini. disebelah kiri list nama */}
            {a.photoUrl && (
              // <Image src={resolvePhotoUrl(a.photoUrl)!} alt={`Foto ${a.name}`} width={64} height={64} className="h-16 w-16 object-cover rounded-full mr-4 float-left" />
              <Image
                src={withVersion(resolvePhotoUrl(a.photoUrl)!, a.photoUpdatedAt)}
                alt={`Foto ${a.name}`}
                width={64}
                height={64}
                unoptimized
                className="h-16 w-16 object-cover rounded-full mr-4 float-left"
                onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                  const img = e.currentTarget;
                  img.removeAttribute('srcset');
                  if (!tryNextCandidate(img)) {
                    img.src = '/profiles/placeholder.jpg';
                  }
                }}
              />
            )}
            {/** jika tidak ada photoUrl, munculkan placeholder */}
            {!a.photoUrl && (
              <div className="h-16 w-16 bg-gray-200 rounded-full mr-4 float-left flex items-center justify-center text-gray-500 font-size-sm">
                No Photo
              </div>
            )}
            <div className="font-semibold">{a.name}</div>
            <div className="text-sm text-gray-600">{a.nomorAlumni}</div>
            <div className="text-xs text-gray-500">
              {a.program || '-'} | No. HP :
              {
                //a.nohp || '-'
                //masking nohp, hanya menampilkan 4 digit terakhir
                a.nohp
                  ? (a.nohp.length > 4 ? '*******' + a.nohp.slice(-4) : a.nohp)
                  : '-'

              }
            </div>
          </div>
        </button>
      ))}

      {/** tampilkan total alumni */}
      <div className="mt-4 text-sm text-gray-600">Total Alumni: {alumni.length}</div>
      <div className="text-sm text-gray-600">{labeljumlah}</div>

      {/** buat modal ketika list di klik, menampilkan sebuah modal yang berisi tampilan seperti sebuah tampilkan IDCard atau KTP atau SIM */}
      {/** tampilan ini berupa detail data dari user yang di klik detailnya */}
      <div>
        <Modal open={showModal} onClose={() => setShowModal(false)} title="">
          {selected && (
            <div className="flex justify-center">
              {/* Kartu identitas */}
              <div className="w-[480px] rounded-xl shadow-lg border relative overflow-hidden bg-white">
                {/* Header/Band warna */}
                <div className="h-10 bg-blue-600">
                  <div className='text-white font-semibold text-center pt-2'>
                    Detail Alumni
                  </div>
                </div>
                {/* Konten Kartu */}
                <div className="p-4 flex">
                  <div className="mr-4">
                    {selected.photoUrl ? (
                      //foto alumni tidak terlihat sepertinya butuh URL yang benar
                      <Image
                        src={withVersion(resolvePhotoUrl(selected.photoUrl)!, selected.photoUpdatedAt)}
                        alt={`Foto ${selected.name}`}
                        width={80}
                        height={80}
                        unoptimized
                        className="h-20 w-20 object-cover rounded-md border"
                        onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                          const img = e.currentTarget;
                          img.removeAttribute('srcset');
                          if (!tryNextCandidate(img)) {
                            img.src = '/profiles/placeholder.jpg';
                          }
                        }}
                      />
                      // <Image src={resolvePhotoUrl(selected.photoUrl)!} alt={`Foto ${selected.name}`} width={64} height={64} className="h-20 w-20 object-cover rounded-md border" />
                    ) : (
                      <div className="h-20 w-20 bg-gray-200 rounded-md flex items-center justify-center text-gray-500">
                        No Photo
                      </div>
                    )}
                    <QRWithLogo
                      value={String(selected.nomorAlumni)}
                      size={80}
                      logoSrc={selected.program === 'IPS' ? '/ips.png' : selected.program === 'Bahasa' ? '/bahasa.png' : '/ipa.png'}
                      className="mt-2"
                    />
                    {/* <div className="flex-grow">
                      <Image src={`${selected.program === 'IPS' ? '/ips.png' : selected.program === 'Bahasa' ? '/bahasa.png' : '/ipa.png'}`} alt="Logo Jurusan" width={60} height={30} className="mt-2" />
                    </div> */}
                  </div>
                  <div className="text-sm flex-1">
                    <div className="grid gap-2 lg:grid-cols-2">
                      <div>
                        <div className="text-xs text-gray-500">NIA</div>
                        <div className="font-bold">{selected.nomorAlumni ?? '-'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Nama</div>
                        <div className="font-medium">{selected.name ?? '-'}</div>
                      </div>
                    </div>
                    <div className="mt-2 grid gap-2 lg:grid-cols-2">
                      <div className="mt-2">
                        <div className="text-xs text-gray-500">No. Telp/Whatsapp</div>
                        <div className="font-medium">
                          {
                            //selected.nohp ?? '-'
                            //masking nohp, hanya menampilkan 4 digit terakhir
                            selected.nohp
                              ? (selected.nohp.length > 4 ? '*******' + selected.nohp.slice(-4) : selected.nohp)
                              : '-'
                          }
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="text-xs text-gray-500">Email</div>
                        <div className="font-medium">
                          {selected.email ? (selected.email.length > 20 ? selected.email.slice(0, 20) + '...' : selected.email) : '-'}
                        </div>
                      </div>
                    </div>
                    {/* <div className="mt-2 grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-xs text-gray-500">Jurusan</div>
                        <div className="font-medium">{selected.program ?? '-'}</div>
                      </div>
                      <div className="mt-2">
                        <div className="text-xs text-gray-500">Tahun Lulus</div>
                        <div className="font-medium">{selected.graduationYear ?? '-'}</div>
                      </div>
                    </div> */}
                    <div className="mt-2 grid gap-2 lg:grid-cols-2">
                      <div className="mt-2">
                        <div className="text-xs text-gray-500">Pekerjaan</div>
                        <div className="font-small text-black-300" style={{ wordBreak: 'break-word' }}>
                          {
                            selected.pekerjaan ? (selected.pekerjaan.length > 30 ? selected.pekerjaan.slice(0, 30) + '...' : selected.pekerjaan) : '-'
                          }
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="text-xs text-gray-500">Umur</div>
                        <div className="font-small text-black-100">
                          {
                            // selected.tanggalLahir
                            //   ? new Date(selected.tanggalLahir).toLocaleDateString('id-ID', {
                            //     //day: '2-digit',
                            //     month: 'short',
                            //     year: 'numeric'
                            //   })
                            //   : '-'
                          }

                          {
                            //convert tanggal ke umur
                            selected.tanggalLahir
                              ? (() => {
                                const birthDate = new Date(selected.tanggalLahir!);
                                const today = new Date();
                                let age = today.getFullYear() - birthDate.getFullYear();
                                const m = today.getMonth() - birthDate.getMonth();
                                if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                                  age--;
                                }
                                return ` ${age} tahun`;
                              })()
                              : '-'

                          }
                          &nbsp;
                          ({
                            selected.tanggalLahir
                              ? new Date(selected.tanggalLahir).toLocaleDateString('id-ID', {
                                //day: '2-digit',
                                //month: 'short',
                                year: 'numeric'
                              })
                              : '-'
                          })
                        </div>
                      </div>
                    </div>
                    {/* <div className="mt-2">
                      <div>
                        <div className="text-xs text-gray-500">Alamat Rumah</div>
                        <div className="font-small text-black-100">{
                          // batasi alamat maksimal 30 karakter
                          selected.alamat ? (selected.alamat.length > 100 ? selected.alamat.slice(0, 100) + '...' : selected.alamat) : '-'
                        }</div>
                      </div>
                    </div> */}
                  </div>
                </div>
              </div>
            </div>
          )}
        </Modal>
      </div >
    </div >


  );
}