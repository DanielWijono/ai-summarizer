"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface Purchase {
    id: string;
    user_id: string;
    package_id: string;
    credits: number;
    amount: number;
    status: string;
    proof_url: string;
    proof_filename: string;
    admin_notes: string | null;
    created_at: string;
    verified_at: string | null;
    user_email?: string;
    user_name?: string;
}

type TabType = "pending" | "history";

export default function AdminPage() {
    const [activeTab, setActiveTab] = useState<TabType>("pending");
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [history, setHistory] = useState<Purchase[]>([]);
    const [loading, setLoading] = useState(true);
    const [adminKey, setAdminKey] = useState("");
    const [authenticated, setAuthenticated] = useState(false);
    const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [imageZoom, setImageZoom] = useState(false);

    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const keyFromUrl = searchParams.get("key");
        const savedKey = localStorage.getItem("admin_key");

        if (keyFromUrl) {
            setAdminKey(keyFromUrl);
            localStorage.setItem("admin_key", keyFromUrl);
            setAuthenticated(true);
        } else if (savedKey) {
            setAdminKey(savedKey);
            setAuthenticated(true);
        } else {
            setLoading(false);
        }
    }, [searchParams]);

    useEffect(() => {
        if (authenticated && adminKey) {
            fetchData();
        }
    }, [authenticated, adminKey]);

    const fetchData = async () => {
        try {
            const [pendingRes, historyRes] = await Promise.all([
                fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/credits/admin/pending?admin_key=${adminKey}`),
                fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/credits/admin/history?admin_key=${adminKey}`)
            ]);

            if (pendingRes.status === 401) {
                setError("Admin key tidak valid");
                setAuthenticated(false);
                localStorage.removeItem("admin_key");
                setLoading(false);
                return;
            }

            const pendingData = await pendingRes.json();
            const historyData = await historyRes.json();

            setPurchases(pendingData.purchases || []);
            setHistory(historyData.purchases || []);
        } catch (err) {
            setError("Gagal memuat data");
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (adminKey.trim()) {
            localStorage.setItem("admin_key", adminKey);
            setAuthenticated(true);
            setLoading(true);
            setError(null);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("admin_key");
        setAuthenticated(false);
        setAdminKey("");
        setPurchases([]);
        setHistory([]);
    };

    const handleAction = async (purchaseId: string, action: "approve" | "reject") => {
        setActionLoading(purchaseId);
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/credits/admin/${action}/${purchaseId}?admin_key=${adminKey}`,
                { method: "POST" }
            );

            if (!res.ok) throw new Error("Action failed");

            // Move to history
            const processed = purchases.find(p => p.id === purchaseId);
            if (processed) {
                setHistory(prev => [{ ...processed, status: action === "approve" ? "approved" : "rejected", verified_at: new Date().toISOString() }, ...prev]);
            }
            setPurchases(prev => prev.filter(p => p.id !== purchaseId));
            setSelectedPurchase(null);
        } catch (err) {
            setError("Aksi gagal");
        } finally {
            setActionLoading(null);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const formatPrice = (amount: number) => `Rp ${amount.toLocaleString("id-ID")}`;

    const getPackageLabel = (id: string) => {
        const labels: Record<string, { name: string; color: string }> = {
            starter: { name: "Starter", color: "#6b7280" },
            value: { name: "Value", color: "#3b82f6" },
            pro: { name: "Pro", color: "#8b5cf6" }
        };
        return labels[id] || { name: id, color: "#6b7280" };
    };

    const getStatusBadge = (status: string) => {
        if (status === "approved") return { label: "Approved", color: "#22c55e", bg: "rgba(34, 197, 94, 0.15)" };
        if (status === "rejected") return { label: "Rejected", color: "#ef4444", bg: "rgba(239, 68, 68, 0.15)" };
        return { label: "Pending", color: "#fbbf24", bg: "rgba(251, 191, 36, 0.15)" };
    };

    const currentList = activeTab === "pending" ? purchases : history;

    // Login Screen
    if (!authenticated) {
        return (
            <div className="admin-auth-container">
                <div className="admin-auth-card">
                    <div className="admin-auth-header">
                        <div className="admin-auth-icon">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                        <h1>Admin Console</h1>
                        <p>Masukkan admin key untuk mengakses panel verifikasi</p>
                    </div>

                    {error && (
                        <div className="admin-auth-error">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                            </svg>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="admin-auth-form">
                        <div className="admin-input-group">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                            </svg>
                            <input
                                type="password"
                                value={adminKey}
                                onChange={(e) => setAdminKey(e.target.value)}
                                placeholder="Admin Key"
                                autoFocus
                            />
                        </div>
                        <button type="submit" className="admin-auth-btn">
                            <span>Masuk ke Admin Panel</span>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
                            </svg>
                        </button>
                    </form>

                    <Link href="/dashboard" className="admin-auth-back">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                        </svg>
                        Kembali ke Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="admin-loading">
                <div className="admin-loading-spinner"></div>
                <p>Memuat data...</p>
            </div>
        );
    }

    return (
        <div className="admin-dashboard">
            {/* Sidebar */}
            <aside className="admin-sidebar">
                <div className="admin-sidebar-header">
                    <div className="admin-logo">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                        </svg>
                        <span>Admin Panel</span>
                    </div>
                </div>

                <nav className="admin-nav">
                    <a
                        className={`admin-nav-item ${activeTab === "pending" ? "active" : ""}`}
                        onClick={() => { setActiveTab("pending"); setSelectedPurchase(null); }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
                        </svg>
                        <span>Verifikasi</span>
                        {purchases.length > 0 && (
                            <span className="admin-nav-badge">{purchases.length}</span>
                        )}
                    </a>
                    <a
                        className={`admin-nav-item ${activeTab === "history" ? "active" : ""}`}
                        onClick={() => { setActiveTab("history"); setSelectedPurchase(null); }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" />
                        </svg>
                        <span>History</span>
                    </a>
                </nav>

                <div className="admin-sidebar-footer">
                    <button onClick={handleLogout} className="admin-logout-btn">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
                        </svg>
                        Keluar
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="admin-main">
                <header className="admin-topbar">
                    <h1>{activeTab === "pending" ? "Verifikasi Pembayaran" : "History Verifikasi"}</h1>
                    <div className="admin-topbar-stats">
                        <div className="stat-item">
                            <span className="stat-value">{activeTab === "pending" ? purchases.length : history.length}</span>
                            <span className="stat-label">{activeTab === "pending" ? "Pending" : "Total"}</span>
                        </div>
                    </div>
                </header>

                {error && (
                    <div className="admin-alert error">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" /></svg>
                        {error}
                    </div>
                )}

                {currentList.length === 0 ? (
                    <div className="admin-empty-state">
                        <div className="empty-icon">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h2>{activeTab === "pending" ? "Semua Terverifikasi" : "Belum Ada History"}</h2>
                        <p>{activeTab === "pending" ? "Tidak ada pembayaran yang menunggu verifikasi" : "Belum ada pembayaran yang diverifikasi"}</p>
                    </div>
                ) : (
                    <div className="admin-content-grid">
                        {/* List */}
                        <div className="admin-list-panel">
                            <div className="panel-header">
                                <h2>{activeTab === "pending" ? "Request Pending" : "History"}</h2>
                            </div>
                            <div className="admin-list">
                                {currentList.map((purchase) => {
                                    const pkg = getPackageLabel(purchase.package_id);
                                    const statusBadge = getStatusBadge(purchase.status);
                                    return (
                                        <div
                                            key={purchase.id}
                                            className={`admin-list-card ${selectedPurchase?.id === purchase.id ? "active" : ""}`}
                                            onClick={() => setSelectedPurchase(purchase)}
                                        >
                                            <div className="card-top">
                                                <span className="card-package" style={{ background: pkg.color }}>
                                                    {pkg.name}
                                                </span>
                                                {activeTab === "history" && (
                                                    <span className="card-status" style={{ background: statusBadge.bg, color: statusBadge.color }}>
                                                        {statusBadge.label}
                                                    </span>
                                                )}
                                                {activeTab === "pending" && (
                                                    <span className="card-credits">{purchase.credits} credits</span>
                                                )}
                                            </div>
                                            <div className="card-user">{purchase.user_name || purchase.user_email || "Unknown"}</div>
                                            <div className="card-amount">{formatPrice(purchase.amount)}</div>
                                            <div className="card-time">
                                                {activeTab === "history" && purchase.verified_at
                                                    ? `Verified: ${formatDate(purchase.verified_at)}`
                                                    : formatDate(purchase.created_at)
                                                }
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Detail */}
                        <div className="admin-detail-panel">
                            {selectedPurchase ? (
                                <>
                                    <div className="panel-header">
                                        <h2>Detail Request</h2>
                                        {activeTab === "pending" ? (
                                            <span className="status-badge pending">Menunggu Verifikasi</span>
                                        ) : (
                                            <span className="status-badge" style={{
                                                background: getStatusBadge(selectedPurchase.status).bg,
                                                color: getStatusBadge(selectedPurchase.status).color
                                            }}>
                                                {getStatusBadge(selectedPurchase.status).label}
                                            </span>
                                        )}
                                    </div>

                                    <div className="detail-grid">
                                        <div className="detail-item full">
                                            <label>User</label>
                                            <div className="detail-user">
                                                <strong>{selectedPurchase.user_name || "Unknown"}</strong>
                                                <span className="detail-email">{selectedPurchase.user_email || "No email"}</span>
                                            </div>
                                        </div>
                                        <div className="detail-item">
                                            <label>Paket</label>
                                            <span className="detail-package" style={{ background: getPackageLabel(selectedPurchase.package_id).color }}>
                                                {getPackageLabel(selectedPurchase.package_id).name}
                                            </span>
                                        </div>
                                        <div className="detail-item">
                                            <label>Credits</label>
                                            <span>{selectedPurchase.credits} credits</span>
                                        </div>
                                        <div className="detail-item full">
                                            <label>Jumlah Transfer</label>
                                            <span className="detail-amount">{formatPrice(selectedPurchase.amount)}</span>
                                        </div>
                                        <div className="detail-item full">
                                            <label>Waktu Request</label>
                                            <span>{formatDate(selectedPurchase.created_at)}</span>
                                        </div>
                                        {selectedPurchase.verified_at && (
                                            <div className="detail-item full">
                                                <label>Waktu Verifikasi</label>
                                                <span>{formatDate(selectedPurchase.verified_at)}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="proof-section">
                                        <label>Bukti Transfer</label>
                                        <div
                                            className={`proof-viewer ${imageZoom ? "zoomed" : ""}`}
                                            onClick={() => setImageZoom(!imageZoom)}
                                        >
                                            <img
                                                src={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/credits/proofs/${selectedPurchase.proof_filename}?admin_key=${adminKey}`}
                                                alt="Bukti Transfer"
                                            />
                                            <div className="proof-zoom-hint">
                                                {imageZoom ? "Klik untuk perkecil" : "Klik untuk perbesar"}
                                            </div>
                                        </div>
                                    </div>

                                    {activeTab === "pending" && (
                                        <div className="action-buttons">
                                            <button
                                                className="action-btn approve"
                                                onClick={() => handleAction(selectedPurchase.id, "approve")}
                                                disabled={actionLoading === selectedPurchase.id}
                                            >
                                                {actionLoading === selectedPurchase.id ? (
                                                    <div className="btn-loading"></div>
                                                ) : (
                                                    <>
                                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                                        </svg>
                                                        Approve & Tambah Credits
                                                    </>
                                                )}
                                            </button>
                                            <button
                                                className="action-btn reject"
                                                onClick={() => handleAction(selectedPurchase.id, "reject")}
                                                disabled={actionLoading === selectedPurchase.id}
                                            >
                                                {actionLoading === selectedPurchase.id ? (
                                                    <div className="btn-loading"></div>
                                                ) : (
                                                    <>
                                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                                        </svg>
                                                        Reject
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="detail-empty">
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <path d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                                    </svg>
                                    <p>Pilih request dari daftar untuk melihat detail</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* Image Zoom Modal */}
            {imageZoom && selectedPurchase && (
                <div className="image-modal" onClick={() => setImageZoom(false)}>
                    <img
                        src={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/credits/proofs/${selectedPurchase.proof_filename}?admin_key=${adminKey}`}
                        alt="Bukti Transfer"
                    />
                </div>
            )}
        </div>
    );
}
