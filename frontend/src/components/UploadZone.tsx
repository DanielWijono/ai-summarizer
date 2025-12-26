"use client";

import { useCallback, useState, useRef } from "react";

const ALLOWED_EXTENSIONS = [
    ".mp3", ".wav", ".m4a", ".ogg",  // Audio
    ".mp4", ".mov", ".mkv", ".avi", ".webm"  // Video
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

interface UploadZoneProps {
    onFileSelect: (file: File) => void;
    selectedFile: File | null;
    onProcess: () => void;
    isProcessing: boolean;
}

export default function UploadZone({
    onFileSelect,
    selectedFile,
    onProcess,
    isProcessing,
}: UploadZoneProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const validateFile = useCallback((file: File): boolean => {
        // Check file extension
        const extension = "." + file.name.split(".").pop()?.toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(extension)) {
            setValidationError(
                `Format file tidak didukung. Gunakan: ${ALLOWED_EXTENSIONS.join(", ")}`
            );
            return false;
        }

        // Check file size
        if (file.size > MAX_FILE_SIZE) {
            const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
            setValidationError(`File terlalu besar (${sizeMB}MB). Maksimal 50MB.`);
            return false;
        }

        setValidationError(null);
        return true;
    }, []);

    const handleFile = useCallback(
        (file: File) => {
            if (validateFile(file)) {
                onFileSelect(file);
            }
        },
        [validateFile, onFileSelect]
    );

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);

            const file = e.dataTransfer.files[0];
            if (file) {
                handleFile(file);
            }
        },
        [handleFile]
    );

    const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) {
                handleFile(file);
            }
        },
        [handleFile]
    );

    const handleClick = useCallback(() => {
        inputRef.current?.click();
    }, []);

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024 * 1024) {
            return (bytes / 1024).toFixed(1) + " KB";
        }
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    };

    const getFileIcon = (filename: string): "audio" | "video" => {
        const ext = filename.split(".").pop()?.toLowerCase();
        const videoExtensions = ["mp4", "mov", "mkv", "avi", "webm"];
        return videoExtensions.includes(ext || "") ? "video" : "audio";
    };

    return (
        <div className="space-y-4">
            {/* Drop Zone */}
            <div
                className={`upload-zone ${isDragging ? "dragging" : ""} ${selectedFile ? "border-solid border-[var(--accent-primary)]" : ""
                    }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={!selectedFile ? handleClick : undefined}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept={ALLOWED_EXTENSIONS.join(",")}
                    onChange={handleInputChange}
                    className="hidden"
                />

                <div className="relative z-10">
                    {!selectedFile ? (
                        <>
                            {/* Upload Icon */}
                            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center">
                                <svg
                                    className="w-10 h-10 text-[var(--accent-primary)]"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={1.5}
                                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                    />
                                </svg>
                            </div>

                            <h3 className="text-lg sm:text-xl font-semibold mb-3">
                                Drag & Drop atau <span className="text-gradient">Klik untuk Upload</span>
                            </h3>
                            <p className="text-[var(--text-secondary)] text-sm sm:text-base mb-2">
                                Audio: MP3, WAV, M4A, OGG
                            </p>
                            <p className="text-[var(--text-secondary)] text-sm sm:text-base mb-4">
                                Video: MP4, MOV, MKV, AVI, WEBM
                            </p>
                            <p className="text-[var(--text-muted)] text-xs">
                                Maksimal 50MB (~50 menit video SD / ~5 jam audio)
                            </p>
                        </>
                    ) : (
                        <>
                            {/* Selected File */}
                            <div className="flex items-center justify-center gap-4">
                                <div className="w-14 h-14 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center">
                                    {getFileIcon(selectedFile.name) === "video" ? (
                                        <svg
                                            className="w-7 h-7 text-[var(--accent-secondary)]"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={1.5}
                                                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                                            />
                                        </svg>
                                    ) : (
                                        <svg
                                            className="w-7 h-7 text-[var(--accent-primary)]"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={1.5}
                                                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                                            />
                                        </svg>
                                    )}
                                </div>
                                <div className="text-left">
                                    <h4 className="font-semibold truncate max-w-[250px]">
                                        {selectedFile.name}
                                    </h4>
                                    <p className="text-sm text-[var(--text-secondary)]">
                                        {formatFileSize(selectedFile.size)}
                                    </p>
                                </div>
                            </div>

                            <div className="flex justify-center gap-3 mt-6">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onProcess();
                                    }}
                                    disabled={isProcessing}
                                    className="btn btn-primary"
                                >
                                    {isProcessing ? (
                                        <>
                                            <div className="loader-small"></div>
                                            <span>Memproses...</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg
                                                className="w-5 h-5"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M13 10V3L4 14h7v7l9-11h-7z"
                                                />
                                            </svg>
                                            <span>Proses Sekarang</span>
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        inputRef.current?.click();
                                    }}
                                    disabled={isProcessing}
                                    className="btn btn-secondary"
                                >
                                    Ganti File
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Validation Error */}
            {validationError && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[rgba(239,68,68,0.1)] border border-[var(--error)]">
                    <svg
                        className="w-5 h-5 text-[var(--error)] flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                    <span className="text-sm text-[var(--error)]">{validationError}</span>
                </div>
            )}
        </div>
    );
}
