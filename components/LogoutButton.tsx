"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const [loading, setLoading] = useState(false);
  const r = useRouter();

  const doLogout = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await fetch('/api/logout', { method: 'POST' });
      r.replace('/'); // kembali ke halaman auth
    } catch (e) {
      console.warn('Logout failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={doLogout}
      className="text-blue-600 underline disabled:opacity-50"
      disabled={loading}
      type="button"
    >
      {loading ? 'Logging out...' : 'Logout'}
    </button>
  );
}