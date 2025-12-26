"use client";

import Link from "next/link";

export default function PaymentFailedPage() {
    return (
        <div className="payment-result">
            <div className="payment-result-card">
                <svg className="payment-result-icon failed" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M15 9l-6 6M9 9l6 6" />
                </svg>

                <h1>Pembayaran Gagal</h1>

                <p>
                    Maaf, pembayaran Anda tidak berhasil.
                    <br />
                    Silakan coba lagi atau hubungi support.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <Link href="/pricing" className="btn btn-primary" style={{ width: "100%" }}>
                        Coba Lagi
                    </Link>
                    <Link href="/dashboard" className="btn btn-secondary" style={{ width: "100%" }}>
                        Kembali ke Dashboard
                    </Link>
                </div>
            </div>
        </div>
    );
}
