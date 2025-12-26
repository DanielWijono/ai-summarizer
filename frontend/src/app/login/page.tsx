"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const { signIn, user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        // If already logged in, redirect to dashboard
        if (user) {
            router.push("/dashboard");
        }
    }, [user, router]);

    useEffect(() => {
        // Check for auth error from callback
        const authError = searchParams.get("error");
        if (authError === "auth_error") {
            setError("Terjadi kesalahan saat autentikasi. Silakan coba lagi.");
        }
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!email.trim()) {
            setError("Email wajib diisi");
            return;
        }
        if (!password) {
            setError("Password wajib diisi");
            return;
        }

        setLoading(true);
        const { error } = await signIn(email, password);
        setLoading(false);

        if (error) {
            if (error.message.includes("Invalid login")) {
                setError("Email atau password salah");
            } else if (error.message.includes("Email not confirmed")) {
                setError("Email belum diverifikasi. Silakan cek inbox Anda.");
            } else {
                setError(error.message);
            }
        } else {
            router.push("/dashboard");
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <div className="auth-logo">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                        </svg>
                    </div>
                    <h1>Selamat Datang</h1>
                    <p>Masuk ke akun Summarizer AI Anda</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    {error && (
                        <div className="auth-error">
                            {error}
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="john@example.com"
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            disabled={loading}
                        />
                    </div>

                    <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                        {loading ? (
                            <>
                                <div className="loader loader-small" />
                                Masuk...
                            </>
                        ) : (
                            "Masuk"
                        )}
                    </button>
                </form>

                <p className="auth-footer">
                    Belum punya akun? <Link href="/register">Daftar</Link>
                </p>
            </div>
        </div>
    );
}
