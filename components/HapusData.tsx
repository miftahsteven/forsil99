"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";

const HapusData: React.FC = () => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const getLoggedInUsername = (): string => {
        //ambil username dari proses createSessionResponse saat login
        if (typeof window === 'undefined') return '';
        const match = document.cookie.match(new RegExp('(^| )username=([^;]+)'));
        console.log('match', match);
        return match ? decodeURIComponent(match[2]) : '';
    }

    const handleDelete = async () => {
        if (!confirm("Apakah Anda yakin ingin menghapus data Anda? Tindakan ini tidak dapat dibatalkan.")) {
            return;
        }
        setLoading(true);
        try {
            const username = getLoggedInUsername();
            if (!username) {
                alert('Gagal mendapatkan informasi user. Silakan login kembali.');
                setLoading(false);
                return;
            }

            const response = await fetch('/api/hapusdata', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username }),
            });

            const result = await response.json();
            if (response.ok) {
                alert('Data Anda telah dihapus. Anda akan diarahkan ke halaman login. Untuk melakukan login, silahkan daftar ulang');
                await fetch('/api/logout', { method: 'POST' });
                //mengirim whatsapp menggunakan /api/whatsapp ke nomor 08558833244 (admin) dan juga mengirim ke nomor yang menghapus data
                //kirim pesan, "anda telah menghapus data dari sistem kami. Jika ini bukan Anda, silakan hubungi admin. "
                await fetch('/api/whatsapp', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        phone: '08558833244',
                        message: `User dengan username ${username} telah menghapus data dari SILUNI.`,
                    }),
                });
                //kirim ke user yang menghapus data
                // username adalah nomor hp diawali 0, ganti 0 dengan 62
                const userPhone = username.startsWith('0') ? '62' + username.slice(1) : username;
                if (userPhone) {
                    await fetch('/api/whatsapp', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            phone: userPhone,
                            message: `Anda telah menghapus data dari SILUNI SMALIX 99. Jika ini bukan Anda, silakan hubungi admin.`,
                        }),
                    });
                }
                router.replace('/');
                router.refresh();
            } else {
                alert(`Gagal menghapus data: ${result.error}`);
            }
        } catch (error) {
            alert('Terjadi kesalahan saat menghapus data. Silakan coba lagi.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <a
            href="#"
            onClick={(e) => {
                e.preventDefault();
                handleDelete();
            }}
            style={{ color: "red", cursor: "pointer" }}
        >
            Hapus Data {loading && "(Memproses...)"}
        </a>
    );
};

export default HapusData;