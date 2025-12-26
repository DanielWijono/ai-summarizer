"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface PackageData {
    id: string;
    name: string;
    credits: number;
    price: number;
    price_formatted: string;
    price_per_credit: number;
    retention_period: string;
    is_popular: boolean;
}

interface BankInfo {
    bank_name: string;
    account_number: string;
    account_holder: string;
}

interface DurationTier {
    max_minutes: number;
    credits_required: number;
    max_file_mb: number;
}

export default function PricingPage() {
    const [packages, setPackages] = useState<PackageData[]>([]);
    const [bankInfo, setBankInfo] = useState<BankInfo | null>(null);
    const [durationTiers, setDurationTiers] = useState<DurationTier[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
    const { user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        fetchPackages();
    }, []);

    const fetchPackages = async () => {
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/credits/packages`
            );
            const data = await res.json();
            setPackages(data.packages);
            setBankInfo(data.bank_info);
            setDurationTiers(data.duration_tiers);
        } catch (err) {
            console.error("Failed to fetch packages:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleBuyNow = (packageId: string) => {
        if (!user) {
            router.push("/login");
            return;
        }
        setSelectedPackage(packageId);
        router.push(`/buy-credits?package=${packageId}`);
    };

    if (loading) {
        return (
            <div className="auth-container">
                <div className="loader" style={{ width: "48px", height: "48px" }} />
            </div>
        );
    }

    return (
        <div className="pricing-page">
            <nav className="pricing-nav">
                <Link href="/dashboard" className="pricing-back">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                    </svg>
                    Kembali ke Dashboard
                </Link>
            </nav>

            <div className="pricing-header">
                <h1>Beli Credits</h1>
                <p>Gunakan credits untuk summarize meeting Anda</p>
            </div>

            <div className="pricing-grid">
                {packages.map((pkg) => (
                    <div
                        key={pkg.id}
                        className={`pricing-card ${pkg.is_popular ? "popular" : ""}`}
                    >
                        {pkg.is_popular && <div className="popular-badge">Best Value</div>}

                        <h2 className="tier-name">{pkg.name}</h2>

                        <div className="tier-price">
                            <span className="price-amount">{pkg.price_formatted}</span>
                        </div>

                        <div className="credit-amount">
                            <span className="credit-number">{pkg.credits}</span>
                            <span className="credit-label">credits</span>
                        </div>

                        <p className="price-per-credit">
                            Rp {pkg.price_per_credit.toLocaleString("id-ID")}/credit
                        </p>

                        <ul className="tier-features">
                            <li>
                                <svg className="check-icon" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                </svg>
                                <span>Credits tidak expire</span>
                            </li>
                            <li>
                                <svg className="check-icon" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                </svg>
                                <span>Video sampai 90 menit</span>
                            </li>
                            <li>
                                <svg className="check-icon" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                </svg>
                                <span>Export hasil</span>
                            </li>
                            <li>
                                <svg className="check-icon" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                </svg>
                                <span>Simpan rekaman: {pkg.retention_period}</span>
                            </li>
                        </ul>

                        <button
                            className={`tier-button ${pkg.is_popular ? "primary" : ""}`}
                            onClick={() => handleBuyNow(pkg.id)}
                        >
                            Beli Sekarang
                        </button>
                    </div>
                ))}
            </div>

            {/* Info sections below pricing cards */}
            <div className="pricing-info-sections">
                {/* Credit usage info */}
                <div className="credit-info-box">
                    <h3>💡 Bagaimana credit digunakan?</h3>
                    <div className="credit-tiers">
                        {durationTiers.map((tier, idx) => (
                            <div key={idx} className="credit-tier-item">
                                <span className="tier-duration">≤ {tier.max_minutes} menit</span>
                                <span className="tier-credits">{tier.credits_required} credit</span>
                                <span className="tier-file">Max {tier.max_file_mb}MB</span>
                            </div>
                        ))}
                    </div>
                    <p className="free-tier-note">
                        🎁 <strong>Free:</strong> 2 credits gratis setiap minggu!
                    </p>
                </div>

                {/* Bank transfer info */}
                {bankInfo && (
                    <div className="bank-info-section">
                        <h3>💳 Cara Pembayaran</h3>
                        <p>Transfer ke rekening berikut:</p>
                        <div className="bank-details">
                            <div className="bank-row">
                                <span>Bank:</span>
                                <strong>{bankInfo.bank_name}</strong>
                            </div>
                            <div className="bank-row">
                                <span>No. Rekening:</span>
                                <strong>{bankInfo.account_number}</strong>
                            </div>
                            <div className="bank-row">
                                <span>Atas Nama:</span>
                                <strong>{bankInfo.account_holder}</strong>
                            </div>
                        </div>
                        <p className="bank-note">
                            Setelah transfer, upload bukti di halaman pembelian untuk verifikasi.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
