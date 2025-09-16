"use client";
import React, { useEffect, useState } from 'react';
import { db } from '../firebase/client';
import { ref, onValue, off, DataSnapshot } from 'firebase/database';
import { mapSnapshot, Alumni } from '../lib/alumni';

interface AlumniWithPhoto extends Alumni {
  photoUrl?: string; // tambahkan properti photoUrl
}

export default function AlumniList() {
  const [alumni, setAlumni] = useState<AlumniWithPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [labeljumlah, setLabeljumlah] = useState('');


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
        <div key={a.id} className="border rounded p-3">
          {/** munculkan foto dari photoUrl di section ini. disebelah kiri list nama */}
          {a.photoUrl && (
            <img
              src={a.photoUrl}
              alt={`Foto ${a.name}`}
              className="h-16 w-16 object-cover rounded-full mr-4 float-left"
            />
          )}
          {/** jika tidak ada photoUrl, munculkan placeholder */}
          {!a.photoUrl && (
            <div className="h-16 w-16 bg-gray-200 rounded-full mr-4 float-left flex items-center justify-center text-gray-500 font-size-sm">
              No Photo
            </div>
          )}
          <div className="font-semibold">{a.name}</div>
          <div className="text-sm text-gray-600">{a.email}</div>
          <div className="text-xs text-gray-500">
            {a.program || '-'} | No. HP: {a.nohp || '-'}
          </div>
        </div>
      ))}
      <div className="mt-4 text-sm text-gray-600">Total Alumni: {alumni.length}</div>
      <div className="text-sm text-gray-600">{labeljumlah}</div>

    </div>
  );
}