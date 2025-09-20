"use client";
import React, { useEffect, useState } from 'react';
import { db } from '../firebase/client';
import { ref, onValue, off, DataSnapshot } from 'firebase/database';
import { mapSnapshot, Alumni } from '../lib/alumni';
import Modal from './Modal';
import Image from 'next/image';
import QRCode from 'react-qr-code';

interface AlumniWithPhoto extends Alumni {
  photoUrl?: string; // tambahkan properti photoUrl
}

export default function AlumniList() {
  const [alumni, setAlumni] = useState<AlumniWithPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [labeljumlah, setLabeljumlah] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<AlumniWithPhoto | null>(null);

  // const resolvePhotoUrl = (photoUrl?: string) => {
  //   if (!photoUrl) return undefined;
  //   // If already absolute or data/blob, use as-is
  //   if (/^(https?:|data:|blob:)/i.test(photoUrl)) return photoUrl;

  //   // Otherwise join with NEXT_PUBLIC_BASE_URL when provided
  //   const base = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '');
  //   const path = photoUrl.startsWith('/') ? photoUrl : `/${photoUrl}`;
  //   return base ? `${base}${path}` : path; // fallback to relative
  // };
  // const resolvePhotoUrl = (photoUrl?: string) => {
  //   if (!photoUrl) return undefined;
  //   const url = String(photoUrl).trim();
  //   if (/^(https?:|data:|blob:)/i.test(url)) return url;
  //   // pakai path relatif ke folder public
  //   if (/^\/?profiles\//i.test(url)) return `/${url.replace(/^\/+/, '')}`;
  //   return url.startsWith('/') ? url : `/${url}`;
  // };
  // const resolvePhotoUrl = (photoUrl?: string) => {
  //   if (!photoUrl) return undefined;
  //   const url = String(photoUrl).trim();

  //   // Jika sudah absolute atau data/blob
  //   if (/^(https?:|data:|blob:)/i.test(url)) return url;

  //   // Jika menunjuk ke public/profiles, pakai path relatif ke origin
  //   if (/^\/?profiles\//i.test(url)) return `/${url.replace(/^\/+/, '')}`;

  //   // Fallback umum: relative path
  //   return url.startsWith('/') ? url : `/${url}`;
  // };

  const resolvePhotoUrl = (photoUrl?: string) => {
    if (!photoUrl) return undefined;
    const url = String(photoUrl).trim();
    if (/^(https?:|data:|blob:)/i.test(url)) return url;
    if (/^\/?profiles\//i.test(url)) return `/${url.replace(/^\/+/, '')}`;
    return url.startsWith('/') ? url : `/${url}`;
  };

  const flipExtCase = (url: string) => {
    const u = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    const m = u.pathname.match(/\.(jpg|jpeg)$/i);
    if (!m) return url;
    const ext = m[1];
    const flipped = /[a-z]/.test(ext) ? ext.toUpperCase() : ext.toLowerCase();
    u.pathname = u.pathname.replace(/\.(jpg|jpeg)$/i, `.${flipped}`);
    return u.toString().replace(u.origin, ''); // kembalikan sebagai path relatif
  };

  useEffect(() => {
    const r = ref(db, 'alumni');
    const unsubscribe = onValue(
      r,
      (snap: DataSnapshot) => {
        setAlumni(mapSnapshot(snap));
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
      <div className="mb-4">
        <input
          type="text"
          placeholder="Cari alumni berdasarkan nama..."
          className="w-full p-2 border rounded"
          onChange={e => {
            const keyword = e.target.value.toLowerCase();
            setLoading(true);
            const r = ref(db, 'alumni');
            onValue(
              r,
              (snap: DataSnapshot) => {
                const allAlumni = mapSnapshot(snap);
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

      {loading && <p>Memuat data...</p>}
      {/** tambahkan urutan huruf sebagai pagination huruf awal dari nama alumni */}
      {/** contoh: A, B, C, D, dst. jika diklik, maka filter alumni yang namanya diawali huruf tersebut */}
      {/** jika tidak ada alumni yang namanya diawali huruf tersebut, maka tampilkan pesan "Tidak ada alumni dengan nama awal {huruf}" */}
      <div className="flex space-x-2 overflow-x-auto mb-4">
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
              <img
                src={resolvePhotoUrl(a.photoUrl)}
                alt={`Foto ${a.name}`}
                className="h-16 w-16 object-cover rounded-full mr-4 float-left"
                onError={(e) => {
                  const img = e.currentTarget;
                  if ((img as any)._triedFlip) return;       // cegah loop
                  (img as any)._triedFlip = true;
                  img.src = flipExtCase(img.src);
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
              {a.program || '-'} | No. HP: {a.nohp || '-'}
            </div>
          </div>
        </button>
      ))}
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
                      <img
                        src={resolvePhotoUrl(selected.photoUrl)}
                        alt={`Foto ${selected.name}`}
                        className="h-20 w-20 object-cover rounded-md border"
                        onError={(e) => {
                          const img = e.currentTarget;
                          if ((img as any)._triedFlip) return;
                          (img as any)._triedFlip = true;
                          img.src = flipExtCase(img.src);
                        }}
                      />
                      // <Image src={resolvePhotoUrl(selected.photoUrl)!} alt={`Foto ${selected.name}`} width={64} height={64} className="h-20 w-20 object-cover rounded-md border" />
                    ) : (
                      <div className="h-20 w-20 bg-gray-200 rounded-md flex items-center justify-center text-gray-500">
                        No Photo
                      </div>
                    )}
                    <QRCode
                      value={String(selected.nomorAlumni)}
                      size={70}
                      bgColor="#FFFFFF"
                      fgColor="#000000"
                      level="L"
                      className="mt-2"
                    />
                  </div>
                  <div className="text-sm flex-1">
                    <div className="grid">
                      <div>
                        <div className="text-xs text-gray-500">NIA</div>
                        <div className="font-bold">{selected.nomorAlumni ?? '-'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Nama</div>
                        <div className="font-medium">{selected.name ?? '-'}</div>
                      </div>
                    </div>
                    <div className="mt-2 grid">
                      <div className="mt-2">
                        <div className="text-xs text-gray-500">No. Telp/Whatsapp</div>
                        <div className="font-medium">{selected.nohp ?? '-'}</div>
                      </div>
                      <div className="mt-2">
                        <div className="text-xs text-gray-500">Email</div>
                        <div className="font-medium">
                          {selected.email ? (selected.email.length > 25 ? selected.email.slice(0, 25) + '...' : selected.email) : '-'}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-2">
                      <div>
                        <div className="text-xs text-gray-500">Jurusan</div>
                        <div className="font-medium">{selected.program ?? '-'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Tahun Lulus</div>
                        <div className="font-medium">{selected.graduationYear ?? '-'}</div>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-2">
                      <div>
                        <div className="text-xs text-gray-500">Pekerjaan</div>
                        <div className="font-medium">{
                          // batasi pekerjaan maksimal 30 karakter
                          selected.pekerjaan ? (selected.pekerjaan.length > 30 ? selected.pekerjaan.slice(0, 30) + '...' : selected.pekerjaan) : '-'
                        }</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Tanggal Lahir</div>
                        <div className="font-medium">
                          {
                            selected.tanggalLahir
                              ? new Date(selected.tanggalLahir).toLocaleDateString('id-ID', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })
                              : '-'
                          }
                        </div>
                      </div>
                    </div>
                    <div className="mt-2">
                      <div>
                        <div className="text-xs text-gray-500">Alamat Rumah</div>
                        <div className="font-medium">{
                          // batasi alamat maksimal 30 karakter
                          selected.alamat ? (selected.alamat.length > 100 ? selected.alamat.slice(0, 100) + '...' : selected.alamat) : '-'
                        }</div>
                      </div>
                    </div>
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