import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

// /app/auth/login.tsx

// Lazy load (optional; remove dynamic if not needed)
const Login = dynamic(() => import('../../components/LoginForm'), { ssr: true });

export const metadata: Metadata = {
    title: 'Login',
};

export default function LoginPage() {
    return (
        <main className="min-h-screen flex items-center justify-center p-0">
            <Login />
        </main>
    );
}