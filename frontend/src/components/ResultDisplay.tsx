"use client";

import { useState, useCallback } from "react";

interface Summary {
    ringkasan_singkat: string;
    poin_penting: string[];
    action_items: string[];
}

interface ProcessingResult {
    status: string;
    original_filename: string;
    duration_minutes: number;
    transcript: string;
    summary: Summary;
}

interface ResultDisplayProps {
    result: ProcessingResult;
    onReset: () => void;
}

type SectionKey = "summary" | "transcript" | "points" | "actions";

export default function ResultDisplay({ result, onReset }: ResultDisplayProps) {
    const [expandedSections, setExpandedSections] = useState<Set<SectionKey>>(
        new Set(["summary", "points", "actions"])
    );
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const toggleSection = useCallback((section: SectionKey) => {
        setExpandedSections((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(section)) {
                newSet.delete(section);
            } else {
                newSet.add(section);
            }
            return newSet;
        });
    }, []);

    const copyToClipboard = useCallback(async (text: string, field: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedField(field);
            setTimeout(() => setCopiedField(null), 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    }, []);

    const downloadAsText = useCallback(() => {
        const content = `
AI Meeting Notes & Summarizer
=============================

File: ${result.original_filename}
Durasi: ${result.duration_minutes} menit

RINGKASAN
---------
${result.summary.ringkasan_singkat}

POIN PENTING
------------
${result.summary.poin_penting.map((p, i) => `${i + 1}. ${p}`).join("\n")}

ACTION ITEMS
------------
${result.summary.action_items.map((a, i) => `${i + 1}. ${a}`).join("\n")}

TRANSKRIP LENGKAP
-----------------
${result.transcript}
    `.trim();

        const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `meeting-notes-${result.original_filename.split(".")[0]}.txt`;
        link.click();
        URL.revokeObjectURL(url);
    }, [result]);

    const renderCopyButton = (text: string, field: string) => (
        <button
            onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(text, field);
            }}
            className="p-2 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors"
            title="Salin"
        >
            {copiedField === field ? (
                <svg className="w-4 h-4 text-[var(--success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
            ) : (
                <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
            )}
        </button>
    );

    const renderChevron = (isExpanded: boolean) => (
        <svg
            className={`w-5 h-5 text-[var(--text-muted)] transition-transform ${isExpanded ? "rotate-180" : ""
                }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
        >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
    );

    return (
        <div className="space-y-6">
            {/* Success Header */}
            <div className="card border-gradient">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-[rgba(34,197,94,0.1)] flex items-center justify-center">
                        <svg className="w-7 h-7 text-[var(--success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold mb-1">Berhasil Diproses!</h2>
                        <p className="text-[var(--text-secondary)]">
                            {result.original_filename} • {result.duration_minutes} menit
                        </p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 mt-6">
                    <button onClick={downloadAsText} className="btn btn-primary">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span>Download TXT</span>
                    </button>
                    <button onClick={onReset} className="btn btn-secondary">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Upload File Lain</span>
                    </button>
                </div>
            </div>

            {/* Ringkasan Singkat */}
            <div className="result-section">
                <div
                    className="result-header"
                    onClick={() => toggleSection("summary")}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[rgba(99,102,241,0.1)] flex items-center justify-center">
                            <svg className="w-4 h-4 text-[var(--accent-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                            </svg>
                        </div>
                        <span className="font-semibold">Ringkasan</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {renderCopyButton(result.summary.ringkasan_singkat, "summary")}
                        {renderChevron(expandedSections.has("summary"))}
                    </div>
                </div>
                {expandedSections.has("summary") && (
                    <div className="result-content">
                        <p className="text-[var(--text-secondary)] leading-relaxed">
                            {result.summary.ringkasan_singkat}
                        </p>
                    </div>
                )}
            </div>

            {/* Poin Penting */}
            <div className="result-section">
                <div
                    className="result-header"
                    onClick={() => toggleSection("points")}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[rgba(139,92,246,0.1)] flex items-center justify-center">
                            <svg className="w-4 h-4 text-[var(--accent-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </div>
                        <span className="font-semibold">Poin Penting</span>
                        <span className="badge badge-info">{result.summary.poin_penting.length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {renderCopyButton(result.summary.poin_penting.join("\n"), "points")}
                        {renderChevron(expandedSections.has("points"))}
                    </div>
                </div>
                {expandedSections.has("points") && (
                    <div className="result-content">
                        <ul className="space-y-3">
                            {result.summary.poin_penting.map((point, index) => (
                                <li key={index} className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-xs font-medium text-[var(--accent-secondary)]">
                                        {index + 1}
                                    </span>
                                    <span className="text-[var(--text-secondary)]">{point}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* Action Items */}
            <div className="result-section">
                <div
                    className="result-header"
                    onClick={() => toggleSection("actions")}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[rgba(34,197,94,0.1)] flex items-center justify-center">
                            <svg className="w-4 h-4 text-[var(--success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                        </div>
                        <span className="font-semibold">Action Items</span>
                        <span className="badge badge-success">{result.summary.action_items.length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {renderCopyButton(result.summary.action_items.join("\n"), "actions")}
                        {renderChevron(expandedSections.has("actions"))}
                    </div>
                </div>
                {expandedSections.has("actions") && (
                    <div className="result-content">
                        {result.summary.action_items.length > 0 ? (
                            <div className="space-y-2">
                                {result.summary.action_items.map((item, index) => (
                                    <div key={index} className="action-item">
                                        <div className="action-item-icon">
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <span className="text-[var(--text-secondary)]">{item}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-[var(--text-muted)] text-center py-4">
                                Tidak ada action items yang terdeteksi
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Transkrip */}
            <div className="result-section">
                <div
                    className="result-header"
                    onClick={() => toggleSection("transcript")}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center">
                            <svg className="w-4 h-4 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <span className="font-semibold">Transkrip Lengkap</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {renderCopyButton(result.transcript, "transcript")}
                        {renderChevron(expandedSections.has("transcript"))}
                    </div>
                </div>
                {expandedSections.has("transcript") && (
                    <div className="result-content">
                        <p className="text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed text-sm">
                            {result.transcript}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
