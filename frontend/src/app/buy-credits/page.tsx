"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface PackageData {
    id: string;
    name: string;
    credits: number;
    price: number;
    price_formatted: string;
}

interface BankInfo {
    bank_name: string;
    account_number: string;
    account_holder: string;
}

export default function BuyCreditsPage() {
    const [packages, setPackages] = useState<PackageData[]>([]);
    const [bankInfo, setBankInfo] = useState<BankInfo | null>(null);
    const [selectedPackage, setSelectedPackage] = useState<PackageData | null>(null);
    const [proofFile, setProofFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        if (!user) {
            router.push("/login");
            return;
        }
        fetchPackages();
    }, [user, router]);

    useEffect(() => {
        // Get package from URL
        const pkgId = searchParams.get("package");
        if (pkgId && packages.length > 0) {
            const pkg = packages.find(p => p.id === pkgId);
            if (pkg) setSelectedPackage(pkg);
        }
    }, [searchParams, packages]);

    const fetchPackages = async () => {
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/credits/packages`
            );
            const data = await res.json();
            setPackages(data.packages);
            setBankInfo(data.bank_info);
        } catch (err) {
            console.error("Failed to fetch packages:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file type
            const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
            if (!allowedTypes.includes(file.type)) {
                setError("Hanya file gambar (JPEG, PNG, WebP) yang diizinkan");
                return;
            }
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                setError("Ukuran file maksimal 5MB");
                return;
            }
            setProofFile(file);
            setError(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedPackage || !proofFile || !user) {
            setError("Pilih paket dan upload bukti transfer");
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append("user_id", user.id);
            formData.append("package_id", selectedPackage.id);
            formData.append("proof", proofFile);

            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/credits/purchase`,
                { method: "POST", body: formData }
            );

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.detail || "Gagal mengirim pembelian");
            }

            setSuccess(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Terjadi kesalahan");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="auth-container">
                <div className="loader" style={{ width: "48px", height: "48px" }} />
            </div>
        );
    }

    if (success) {
        return (
            <div className="payment-result">
                <div className="payment-result-card">
                    <svg className="payment-result-icon success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>

                    <h1>Bukti Transfer Dikirim! 📝</h1>

                    <p>
                        Pembelian Anda sedang diverifikasi.
                        <br />
                        Credits akan ditambahkan dalam 1x24 jam setelah verifikasi.
                    </p>

                    <Link href="/dashboard" className="btn btn-primary" style={{ width: "100%" }}>
                        Kembali ke Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="buy-credits-page">
            <nav className="pricing-nav">
                <Link href="/pricing" className="pricing-back">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                    </svg>
                    Kembali ke Pricing
                </Link>
            </nav>

            <div className="buy-credits-container">
                <h1>Beli Credits</h1>

                {/* Package Selection */}
                <div className="form-section">
                    <label>1. Pilih Paket</label>
                    <div className="package-options">
                        {packages.map((pkg) => (
                            <button
                                key={pkg.id}
                                type="button"
                                className={`package-option ${selectedPackage?.id === pkg.id ? "selected" : ""}`}
                                onClick={() => setSelectedPackage(pkg)}
                            >
                                <span className="pkg-name">{pkg.name}</span>
                                <span className="pkg-credits">{pkg.credits} credits</span>
                                <span className="pkg-price">{pkg.price_formatted}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Bank Info */}
                {selectedPackage && bankInfo && (
                    <div className="form-section">
                        <label>2. Transfer ke Rekening</label>
                        <div className="bank-transfer-box">
                            <div className="transfer-amount">
                                Transfer sebesar: <strong>{selectedPackage.price_formatted}</strong>
                            </div>
                            <div className="bank-details">
                                <div className="bank-row">
                                    <span>Bank:</span>
                                    <strong>{bankInfo.bank_name}</strong>
                                </div>
                                <div className="bank-row">
                                    <span>No. Rekening:</span>
                                    <strong className="account-number">{bankInfo.account_number}</strong>
                                    <button
                                        type="button"
                                        className="copy-btn"
                                        onClick={() => navigator.clipboard.writeText(bankInfo.account_number)}
                                    >
                                        📋 Copy
                                    </button>
                                </div>
                                <div className="bank-row">
                                    <span>Atas Nama:</span>
                                    <strong>{bankInfo.account_holder}</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Proof Upload */}
                {selectedPackage && (
                    <form onSubmit={handleSubmit}>
                        <div className="form-section">
                            <label>3. Upload Bukti Transfer</label>

                            <div
                                className={`upload-area ${proofFile ? "has-file" : ""}`}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {proofFile ? (
                                    <div className="file-preview">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                        </svg>
                                        <span>{proofFile.name}</span>
                                    </div>
                                ) : (
                                    <>
                                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                            <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6a2 2 0 11-4 0 2 2 0 014 0zm4.5 12H5.5a2 2 0 01-2-2V6a2 2 0 012-2h13a2 2 0 012 2v12a2 2 0 01-2 2z" />
                                        </svg>
                                        <p>Klik untuk upload screenshot bukti transfer</p>
                                        <span className="upload-hint">JPEG, PNG, atau WebP (max 5MB)</span>
                                    </>
                                )}
                            </div>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={handleFileChange}
                                style={{ display: "none" }}
                            />
                        </div>

                        {error && (
                            <div className="auth-error" style={{ marginBottom: "16px" }}>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="btn btn-primary btn-full"
                            disabled={!proofFile || submitting}
                        >
                            {submitting ? (
                                <>
                                    <div className="loader loader-small" />
                                    Mengirim...
                                </>
                            ) : (
                                "Kirim Bukti Transfer"
                            )}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
