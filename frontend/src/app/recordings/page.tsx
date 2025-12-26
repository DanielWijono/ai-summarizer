"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import "./recordings.css";

interface Summary {
    ringkasan_singkat: string;
    poin_penting: string[];
    action_items: string[];
}

interface Recording {
    id: string;
    filename: string;
    duration_minutes: number;
    file_size_mb: number;
    credits_used: number;
    transcript: string;
    summary: Summary;
    created_at: string;
}

export default function RecordingsPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [recordings, setRecordings] = useState<Recording[]>([]);
    const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
    const [loadingData, setLoadingData] = useState(true);
    const [openSections, setOpenSections] = useState({
        summary: true,
        keyPoints: true,
        actionItems: true,
        transcript: false
    });

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
        }
    }, [user, loading, router]);

    useEffect(() => {
        console.log("Auth state:", { loading, user: user?.id });
        if (user && !loading) {
            fetchRecordings();
        }
    }, [user, loading]);

    const fetchRecordings = async () => {
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/credits/recordings?user_id=${user?.id}`
            );
            const data = await res.json();
            setRecordings(data.recordings || []);
            if (data.recordings?.length > 0) {
                setSelectedRecording(data.recordings[0]);
            }
        } catch (err) {
            console.error("Failed to fetch recordings:", err);
        } finally {
            setLoadingData(false);
        }
    };

    const toggleSection = (section: keyof typeof openSections) => {
        setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
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

    if (loading || !user) {
        return (
            <div className="auth-container">
                <div className="loader" style={{ width: "48px", height: "48px" }} />
            </div>
        );
    }

    return (
        <div className="recordings-page">
            {/* Header */}
            <header className="recordings-header">
                <div className="header-left">
                    <Link href="/dashboard" className="back-btn">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                        </svg>
                        Back to Dashboard
                    </Link>
                </div>
                <h1>My Recordings</h1>
                <div className="header-right">
                    <span className="recording-count">{recordings.length} recordings</span>
                </div>
            </header>

            <div className="recordings-content">
                {loadingData ? (
                    <div className="recordings-loading">
                        <div className="loader" style={{ width: "40px", height: "40px" }} />
                        <p>Loading recordings...</p>
                    </div>
                ) : recordings.length === 0 ? (
                    <div className="recordings-empty">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        <h2>No recordings yet</h2>
                        <p>Upload your first meeting recording to get started.</p>
                        <Link href="/dashboard" className="btn-primary">
                            Go to Dashboard
                        </Link>
                    </div>
                ) : (
                    <>
                        {/* List Panel */}
                        <aside className="recordings-list-panel">
                            <div className="list-header">
                                <h2>Recording History</h2>
                            </div>
                            <div className="recordings-list">
                                {recordings.map((recording) => (
                                    <div
                                        key={recording.id}
                                        className={`recording-card ${selectedRecording?.id === recording.id ? "active" : ""}`}
                                        onClick={() => setSelectedRecording(recording)}
                                    >
                                        <div className="recording-icon">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M8 5v14l11-7z" />
                                            </svg>
                                        </div>
                                        <div className="recording-info">
                                            <div className="recording-name">{recording.filename}</div>
                                            <div className="recording-meta">
                                                <span>{recording.duration_minutes} min</span>
                                                <span>•</span>
                                                <span>{formatDate(recording.created_at)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </aside>

                        {/* Detail Panel */}
                        <main className="recordings-detail-panel">
                            {selectedRecording ? (
                                <>
                                    <div className="detail-header">
                                        <h2>{selectedRecording.filename}</h2>
                                        <div className="detail-meta">
                                            <span className="meta-badge">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                                                </svg>
                                                {selectedRecording.duration_minutes} minutes
                                            </span>
                                            <span className="meta-badge">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                                                </svg>
                                                {formatDate(selectedRecording.created_at)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="detail-content">
                                        {/* Summary Section */}
                                        <div className="result-section">
                                            <div className="section-header" onClick={() => toggleSection("summary")}>
                                                <h3>📝 Ringkasan</h3>
                                                <span className={`chevron ${openSections.summary ? "open" : ""}`}>▼</span>
                                            </div>
                                            {openSections.summary && (
                                                <div className="section-content">
                                                    <p>{selectedRecording.summary?.ringkasan_singkat || "Tidak ada ringkasan"}</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Key Points Section */}
                                        <div className="result-section">
                                            <div className="section-header" onClick={() => toggleSection("keyPoints")}>
                                                <h3>💡 Poin Penting</h3>
                                                <span className={`chevron ${openSections.keyPoints ? "open" : ""}`}>▼</span>
                                            </div>
                                            {openSections.keyPoints && (
                                                <div className="section-content">
                                                    {selectedRecording.summary?.poin_penting?.length > 0 ? (
                                                        <ul className="key-points-list">
                                                            {selectedRecording.summary.poin_penting.map((point, i) => (
                                                                <li key={i}>{point}</li>
                                                            ))}
                                                        </ul>
                                                    ) : (
                                                        <p className="text-muted">Tidak ada poin penting</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Action Items Section */}
                                        <div className="result-section">
                                            <div className="section-header" onClick={() => toggleSection("actionItems")}>
                                                <h3>✅ Action Items</h3>
                                                <span className={`chevron ${openSections.actionItems ? "open" : ""}`}>▼</span>
                                            </div>
                                            {openSections.actionItems && (
                                                <div className="section-content">
                                                    {selectedRecording.summary?.action_items?.length > 0 ? (
                                                        <ul className="action-items-list">
                                                            {selectedRecording.summary.action_items.map((item, i) => (
                                                                <li key={i}>{item}</li>
                                                            ))}
                                                        </ul>
                                                    ) : (
                                                        <p className="text-muted">Tidak ada action items</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Transcript Section */}
                                        <div className="result-section">
                                            <div className="section-header" onClick={() => toggleSection("transcript")}>
                                                <h3>📄 Transkrip</h3>
                                                <span className={`chevron ${openSections.transcript ? "open" : ""}`}>▼</span>
                                            </div>
                                            {openSections.transcript && (
                                                <div className="section-content transcript-content">
                                                    <pre>{selectedRecording.transcript || "Tidak ada transkrip"}</pre>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="detail-empty">
                                    <p>Select a recording to view details</p>
                                </div>
                            )}
                        </main>
                    </>
                )}
            </div>
        </div>
    );
}
