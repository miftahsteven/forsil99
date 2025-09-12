"use client";
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

interface LoginResponse {
    success: boolean
    message?: string
}

const LoginForm: React.FC = () => {
    const router = useRouter()
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const r = useRouter();

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const json = await res.json();
            if (!res.ok || !json.success) {
                setError(json.error || 'Login gagal');
                return;
            }
            // Redirect
            r.push('/home');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <form onSubmit={submit} style={styles.card} aria-label="Form Login">
                <h2 style={styles.title}>Login</h2>
                <label style={styles.label}>
                    Username
                    <input
                        style={styles.input}
                        type="text"
                        autoComplete="username"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        disabled={loading}
                        required
                    />
                </label>
                <label style={styles.label}>
                    Password
                    <input
                        style={styles.input}
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        disabled={loading}
                        required
                    />
                </label>
                {error && <div style={styles.error} role="alert">{error}</div>}
                <button
                    type="submit"
                    style={{ ...styles.button, ...(loading ? styles.buttonDisabled : {}) }}
                    disabled={loading}
                >
                    {loading ? 'Memproses...' : 'Masuk'}
                </button>
                <p style={styles.hint}>Gunakan password yang dikirim whatsapp server.</p>
            </form>
        </div>
    )
}

const styles: { [k: string]: React.CSSProperties } = {
    container: {
        minHeight: '50dvh',
        display: 'flex',
        //alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f7fb',
        padding: 24
    },
    card: {
        width: '100%',
        maxWidth: 360,
        background: '#ffffff',
        padding: '32px 28px',
        borderRadius: 16,
        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
        display: 'flex',
        flexDirection: 'column',
        gap: 14
    },
    title: {
        margin: 0,
        fontSize: 24,
        fontWeight: 600,
        textAlign: 'center'
    },
    label: {
        display: 'flex',
        flexDirection: 'column',
        fontSize: 14,
        fontWeight: 500,
        gap: 6
    },
    input: {
        border: '1px solid #d0d7e2',
        borderRadius: 8,
        padding: '10px 12px',
        fontSize: 14,
        outline: 'none',
        transition: 'border-color .15s',
    },
    button: {
        marginTop: 8,
        background: '#2563eb',
        color: '#fff',
        border: 'none',
        borderRadius: 8,
        padding: '12px 16px',
        fontSize: 15,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'background .15s'
    },
    buttonDisabled: {
        opacity: 0.7,
        cursor: 'not-allowed'
    },
    error: {
        background: '#fee2e2',
        color: '#b91c1c',
        border: '1px solid #fecaca',
        padding: '8px 10px',
        borderRadius: 8,
        fontSize: 13
    },
    hint: {
        margin: 0,
        marginTop: 4,
        fontSize: 12,
        color: '#64748b',
        textAlign: 'center'
    }
}

// Fokus ring sederhana
if (typeof window !== 'undefined') {
    const styleTagId = '__login_form_focus_styles__'
    if (!document.getElementById(styleTagId)) {
        const s = document.createElement('style')
        s.id = styleTagId
        s.innerHTML = `
            input:focus, button:focus {
                outline: 2px solid #2563eb;
                outline-offset: 2px;
            }
            input:hover:not(:disabled) {
                border-color: #2563eb;
            }
            button:hover:not(:disabled) {
                background:#1d4ed8;
            }
        `
        document.head.appendChild(s)
    }
}

export default LoginForm