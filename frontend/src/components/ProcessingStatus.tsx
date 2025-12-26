"use client";

interface ProcessingStatusProps {
    stage: "uploading" | "processing" | "transcribing" | "summarizing";
    progress: number;
    filename: string;
    onCancel: () => void;
}

const stages = [
    { key: "uploading", label: "Mengupload", icon: "upload" },
    { key: "processing", label: "Memproses Media", icon: "cog" },
    { key: "transcribing", label: "Transkripsi", icon: "mic" },
    { key: "summarizing", label: "Meringkas", icon: "document" },
];

export default function ProcessingStatus({
    stage,
    progress,
    filename,
    onCancel,
}: ProcessingStatusProps) {
    const currentStageIndex = stages.findIndex((s) => s.key === stage);

    const getStageStatus = (index: number) => {
        if (index < currentStageIndex) return "complete";
        if (index === currentStageIndex) return "active";
        return "pending";
    };

    const renderIcon = (iconName: string, status: string) => {
        const baseClass = "w-5 h-5";
        const colorClass =
            status === "complete"
                ? "text-[var(--success)]"
                : status === "active"
                    ? "text-[var(--accent-primary)]"
                    : "text-[var(--text-muted)]";

        if (status === "complete") {
            return (
                <svg className={`${baseClass} ${colorClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
            );
        }

        switch (iconName) {
            case "upload":
                return (
                    <svg className={`${baseClass} ${colorClass} ${status === "active" ? "animate-bounce" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                );
            case "cog":
                return (
                    <svg className={`${baseClass} ${colorClass} ${status === "active" ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                );
            case "mic":
                return (
                    <svg className={`${baseClass} ${colorClass} ${status === "active" ? "animate-pulse" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                );
            case "document":
                return (
                    <svg className={`${baseClass} ${colorClass} ${status === "active" ? "animate-pulse" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                );
            default:
                return null;
        }
    };

    return (
        <div className="card card-elevated animate-pulse-glow">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-semibold mb-1">Sedang Memproses</h3>
                    <p className="text-sm text-[var(--text-secondary)] truncate max-w-[300px]">
                        {filename}
                    </p>
                </div>
                <button
                    onClick={onCancel}
                    className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
                    title="Batalkan"
                >
                    <svg
                        className="w-5 h-5 text-[var(--text-muted)]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                        />
                    </svg>
                </button>
            </div>

            {/* Progress Steps */}
            <div className="space-y-4">
                {stages.map((s, index) => {
                    const status = getStageStatus(index);
                    return (
                        <div key={s.key} className="flex items-center gap-4">
                            {/* Icon */}
                            <div
                                className={`
                  w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                  ${status === "complete"
                                        ? "bg-[rgba(34,197,94,0.1)]"
                                        : status === "active"
                                            ? "bg-[rgba(99,102,241,0.1)]"
                                            : "bg-[var(--bg-tertiary)]"
                                    }
                `}
                            >
                                {renderIcon(s.icon, status)}
                            </div>

                            {/* Label and Progress */}
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                    <span
                                        className={`text-sm font-medium ${status === "pending"
                                                ? "text-[var(--text-muted)]"
                                                : "text-[var(--text-primary)]"
                                            }`}
                                    >
                                        {s.label}
                                    </span>
                                    {status === "complete" && (
                                        <span className="badge badge-success">Selesai</span>
                                    )}
                                    {status === "active" && (
                                        <span className="badge badge-info">Sedang Berjalan</span>
                                    )}
                                </div>

                                {/* Progress Bar for active stage */}
                                {status === "active" && (
                                    <div className="progress-bar">
                                        <div
                                            className="progress-bar-fill"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Estimated Time */}
            <div className="mt-6 pt-4 border-t border-[var(--border-subtle)]">
                <p className="text-sm text-[var(--text-muted)] text-center">
                    Estimasi waktu bergantung pada durasi file...
                </p>
            </div>
        </div>
    );
}
