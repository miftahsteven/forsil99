"use client";
import React, { useEffect, useState } from 'react';
import { db } from '../firebase/client';
import { ref, onValue, off, DataSnapshot } from 'firebase/database';
import { mapSnapshot, Alumni } from '../lib/alumni';

export default function AlumniList() {
  const [alumni, setAlumni] = useState<Alumni[]>([]);
  const [loading, setLoading] = useState(true);

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
  if (!alumni.length) return <p>Belum ada alumni terdaftar.</p>;

  return (
    <div className="space-y-3">
      {alumni.map(a => (
        <div key={a.id} className="border rounded p-3">
          <div className="font-semibold">{a.name}</div>
          <div className="text-sm text-gray-600">{a.email}</div>
          <div className="text-xs text-gray-500">
            {a.program || '-'} | Lulus {a.graduationYear}
          </div>
        </div>
      ))}

    </div>
  );
}