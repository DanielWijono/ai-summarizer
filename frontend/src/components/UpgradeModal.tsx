"use client";

import Link from "next/link";

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    reason: string;
    currentTier: string;
}

export default function UpgradeModal({ isOpen, onClose, reason, currentTier }: UpgradeModalProps) {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                    </svg>
                </button>

                <div className="modal-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                    </svg>
                </div>

                <h2>Upgrade Diperlukan</h2>

                <p className="modal-reason">{reason}</p>

                <p className="modal-subtitle">
                    Paket Anda saat ini: <strong>{currentTier}</strong>
                </p>

                <div className="modal-actions">
                    <Link href="/pricing" className="btn btn-primary" style={{ width: "100%" }}>
                        Lihat Paket Premium
                    </Link>
                    <button className="btn btn-secondary" onClick={onClose} style={{ width: "100%", marginTop: "12px" }}>
                        Nanti Saja
                    </button>
                </div>
            </div>
        </div>
    );
}
