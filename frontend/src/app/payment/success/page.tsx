"use client";

import Link from "next/link";

export default function PaymentSuccessPage() {
    return (
        <div className="payment-result">
            <div className="payment-result-card">
                <svg className="payment-result-icon success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                </svg>

                <h1>Pembayaran Berhasil! 🎉</h1>

                <p>
                    Terima kasih! Langganan Anda telah aktif.
                    <br />
                    Anda sekarang dapat menikmati semua fitur premium.
                </p>

                <Link href="/dashboard" className="btn btn-primary" style={{ width: "100%" }}>
                    Kembali ke Dashboard
                </Link>
            </div>
        </div>
    );
}
