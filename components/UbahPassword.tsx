'use client';
import React, { useState } from 'react';
import { getDatabase, ref, update } from 'firebase/database';
import md5 from 'blueimp-md5';
import { initializeApp } from 'firebase/app';

const app = initializeApp({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
});
const db = getDatabase(app);



type Props = {
    linkText?: string;
};

const UbahPassword: React.FC<Props> = ({ linkText = 'Ubah Password' }) => {
    const [open, setOpen] = useState(false);
    const [password, setPassword] = useState('');
    const [repeatPassword, setRepeatPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const reset = () => {
        setPassword('');
        setRepeatPassword('');
        setError(null);
    };

    const onClose = () => {
        if (saving) return;
        setOpen(false);
        reset();
    };

    const onSave = async () => {
        setError(null);

        if (!password || !repeatPassword) {
            setError('Isi semua field.');
            return;
        }
        if (password.length < 6) {
            setError('Password minimal 6 karakter.');
            return;
        }
        if (password !== repeatPassword) {
            setError('Password tidak sama.');
            return;
        }

        //ubah password dari username yang login saat ini. Ambil dari cookies
        const username = document.cookie
            .split('; ')
            .find((row) => row.startsWith('username='))
            ?.split('=')[1];

        if (!username) {
            setError('Gagal mendapatkan data user. Silakan login ulang.');
            return;
        }

        setSaving(true);
        try {
            const userRef = ref(db, 'auth/' + username);
            await update(userRef, { password: md5(password) });
            alert('Password berhasil diubah.');
            onClose();

            //jalankan api logout di /api/logout
            await fetch('/api/logout', { method: 'POST' });
            //redirect ke halaman login
            window.location.href = '/';

        } catch (e) {
            console.error(e);
            setError('Gagal menyimpan perubahan. Silakan coba lagi.');
        } finally {
            setSaving(false);
        }

    };

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    margin: 0,
                    color: '#2563eb',
                    cursor: 'pointer',
                    font: 'inherit',
                }}
                aria-haspopup="dialog"
                aria-expanded={open}
            >
                {linkText}
            </button>

            {open && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="ubah-password-title"
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0,0,0,0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                    }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) onClose();
                    }}
                >
                    <div
                        style={{
                            background: '#fff',
                            borderRadius: 8,
                            padding: 20,
                            width: '90%',
                            maxWidth: 420,
                            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                        }}
                    >
                        <h2 id="ubah-password-title" style={{ margin: 0, marginBottom: 12 }}>
                            Ubah Password
                        </h2>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <span>Password Baru</span>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={saving}
                                    placeholder="Masukkan password baru"
                                    style={{
                                        padding: '10px 12px',
                                        borderRadius: 6,
                                        border: '1px solid #ddd',
                                        outline: 'none',
                                    }}
                                />
                            </label>

                            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <span>Ulangi Password Baru</span>
                                <input
                                    type="password"
                                    value={repeatPassword}
                                    onChange={(e) => setRepeatPassword(e.target.value)}
                                    disabled={saving}
                                    placeholder="Ulangi password baru"
                                    style={{
                                        padding: '10px 12px',
                                        borderRadius: 6,
                                        border: '1px solid #ddd',
                                        outline: 'none',
                                    }}
                                />
                            </label>

                            {error && (
                                <div style={{ color: '#b91c1c', fontSize: 14 }} role="alert">
                                    {error}
                                </div>
                            )}
                        </div>

                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: 10,
                                marginTop: 16,
                            }}
                        >
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={saving}
                                style={{
                                    padding: '8px 12px',
                                    borderRadius: 6,
                                    border: '1px solid #ddd',
                                    background: '#fff',
                                    cursor: saving ? 'not-allowed' : 'pointer',
                                }}
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={onSave}
                                disabled={saving}
                                style={{
                                    padding: '8px 12px',
                                    borderRadius: 6,
                                    border: 'none',
                                    background: '#2563eb',
                                    color: '#fff',
                                    cursor: saving ? 'not-allowed' : 'pointer',
                                }}
                            >
                                {saving ? 'Menyimpan...' : 'Simpan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default UbahPassword;