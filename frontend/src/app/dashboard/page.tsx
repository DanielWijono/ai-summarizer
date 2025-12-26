"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

// Types
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
  cache_key?: string;
}

interface PartialResult {
  status: string;
  stage: string;
  original_filename: string;
  duration_minutes: number;
  transcript: string;
  cache_key: string;
  error: string;
  message: string;
}

interface FileItem {
  id: string;
  name: string;
  status: "processing" | "completed" | "error";
  progress?: number;
  result?: ProcessingResult;
  partialResult?: PartialResult;
  error?: string;
}

const ALLOWED_EXTENSIONS = [
  ".mp3", ".wav", ".m4a", ".ogg",
  ".mp4", ".mov", ".mkv", ".avi", ".webm"
];
const MAX_FILE_SIZE = 50 * 1024 * 1024;

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [userCredits, setUserCredits] = useState<{ total: number; free: number; paid: number; maxDuration: number } | null>(null);
  const [openSections, setOpenSections] = useState({
    summary: true,
    keyPoints: true,
    actionItems: true,
    transcript: false
  });
  const inputRef = useRef<HTMLInputElement>(null);

  // Derived state to check if any file is being processed
  const isProcessing = files.some(f => f.status === "processing");

  // Fetch user credits
  const fetchUserCredits = useCallback(() => {
    if (user) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/credits/balance?user_id=${user.id}`)
        .then(res => res.json())
        .then(data => {
          setUserCredits({
            total: data.total_credits,
            free: data.free_credits,
            paid: data.paid_credits,
            maxDuration: data.max_duration || 20
          });
        })
        .catch(console.error);
    }
  }, [user]);

  useEffect(() => {
    fetchUserCredits();
  }, [fetchUserCredits]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  const validateFile = (file: File): string | null => {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return "Format file tidak didukung";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "File terlalu besar (max 50MB)";
    }
    return null;
  };

  const getMaxDuration = (): number => {
    return userCredits?.maxDuration || 20;
  };

  const validateDuration = (file: File): Promise<string | null> => {
    return new Promise((resolve) => {
      const isAudio = file.type.startsWith('audio/');
      const isVideo = file.type.startsWith('video/');

      if (!isAudio && !isVideo) {
        // Fallback for mkv using extension check if mime type is missing
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext === 'mkv') {
          // Browsers often can't play MKV, so we might skip validation or assume safe
          // For now, let's skip client validation for MKV to avoid false block
          resolve(null);
          return;
        }
        // If not audio/video and not mkv, skip
        resolve(null);
        return;
      }

      const element = document.createElement(isAudio ? 'audio' : 'video');
      element.preload = 'metadata';

      element.onloadedmetadata = () => {
        const durationMins = element.duration / 60;
        const max = getMaxDuration();

        URL.revokeObjectURL(element.src);

        if (durationMins > max) {
          resolve(`Durasi file (${durationMins.toFixed(1)} menit) melebihi batas paket (${max} menit). Silakan tambah credit.`);
        } else {
          resolve(null);
        }
      };

      element.onerror = () => {
        URL.revokeObjectURL(element.src);
        resolve(null);
      };

      element.src = URL.createObjectURL(file);
    });
  };

  const processFile = useCallback(async (file: File) => {
    const fileId = crypto.randomUUID();
    const fileItem: FileItem = {
      id: fileId,
      name: file.name,
      status: "processing",
      progress: 0
    };

    setFiles(prev => [fileItem, ...prev]);
    setSelectedFileId(fileId);

    const updateFile = (updates: Partial<FileItem>) => {
      setFiles(prev => prev.map(f => f.id === fileId ? { ...f, ...updates } : f));
    };

    try {
      updateFile({ progress: 10 });

      const formData = new FormData();
      formData.append("file", file);

      // Build URL with user_id for saving to history
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const url = new URL(`${baseUrl}/api/process`);
      if (user?.id) {
        url.searchParams.set("user_id", user.id);
      }

      const response = await fetch(url.toString(), { method: "POST", body: formData });

      const data = await response.json();

      if (!response.ok) {
        if (data.status === "partial") {
          updateFile({
            status: "error",
            progress: 100,
            partialResult: data as PartialResult
          });
        } else {
          updateFile({
            status: "error",
            progress: 100,
            error: data.error || data.detail || "Terjadi kesalahan"
          });
        }
      } else {
        updateFile({
          status: "completed",
          progress: 100,
          result: data as ProcessingResult
        });
        // Refresh credits after successful processing
        fetchUserCredits();
      }
    } catch (err) {
      updateFile({
        status: "error",
        progress: 100,
        error: err instanceof Error ? err.message : "Terjadi kesalahan"
      });
    }
  }, [user, fetchUserCredits]);

  // Show loading while checking auth
  if (loading || !user) {
    return (
      <div className="auth-container">
        <div className="loader" style={{ width: "48px", height: "48px" }} />
      </div>
    );
  }

  const selectedFile = files.find(f => f.id === selectedFileId);

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const checkCredits = (): boolean => {
    if (!userCredits) return false;
    // Check if total credits (free + paid) >= 1
    // We use a small epsilon for float comparison just in case, though credits are usually integers
    return (userCredits.free + userCredits.paid) >= 1;
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isProcessing) return;

    // Check credits
    if (!checkCredits()) {
      alert("Credit tidak cukup. Silakan top up credit Anda.");
      e.target.value = "";
      return;
    }

    const file = e.target.files?.[0];
    // Reset input value
    e.target.value = "";

    if (file) {
      const error = validateFile(file);
      if (error) {
        alert(error);
        return;
      }

      // Async duration check
      const durationError = await validateDuration(file);
      if (durationError) {
        alert(durationError);
        return;
      }

      processFile(file);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (isProcessing) return;

    // Check credits
    if (!checkCredits()) {
      alert("Credit tidak cukup. Silakan top up credit Anda.");
      return;
    }

    const file = e.dataTransfer.files[0];
    if (file) {
      const error = validateFile(file);
      if (error) {
        alert(error);
        return;
      }

      // Async duration check
      const durationError = await validateDuration(file);
      if (durationError) {
        alert(durationError);
        return;
      }

      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isProcessing) {
      setIsDragging(true);
    }
  };

  const handleRetrySummarization = async () => {
    if (!selectedFile?.partialResult?.cache_key) return;

    setIsRetrying(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/retry-summary`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cache_key: selectedFile.partialResult.cache_key })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.detail);
      }

      setFiles(prev => prev.map(f =>
        f.id === selectedFileId
          ? { ...f, status: "completed" as const, result: data, partialResult: undefined, error: undefined }
          : f
      ));
      fetchUserCredits(); // Refresh credits after successful retry
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal retry");
    } finally {
      setIsRetrying(false);
    }
  };

  const downloadReport = () => {
    if (!selectedFile?.result) return;
    const { result } = selectedFile;

    const content = `# ${result.original_filename}
Durasi: ${result.duration_minutes} menit

## Ringkasan
${result.summary.ringkasan_singkat}

## Poin Penting
${result.summary.poin_penting.map(p => `• ${p}`).join('\n')}

## Action Items
${result.summary.action_items.map(a => `☐ ${a}`).join('\n')}

## Transkrip Lengkap
${result.transcript}
`;

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.original_filename.replace(/\.[^.]+$/, "")}_summary.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="dashboard-layout">
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-brand">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
          </svg>
          Summarizer AI
        </div>

        <div className="navbar-tabs">
          <button className="navbar-tab active">Dashboard</button>
          <button className="navbar-tab" onClick={() => router.push("/recordings")}>My Recordings</button>
          <button className="navbar-tab" onClick={() => router.push("/pricing")}>Pricing</button>
        </div>

        <div className="navbar-user" style={{ position: "relative" }}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "inherit",
              padding: "6px 12px",
              borderRadius: "20px"
            }}
          >
            <div className="avatar-placeholder">
              {user.email?.[0].toUpperCase() || "U"}
            </div>
            {userCredits !== null && (
              <span className="credits-badge" style={{
                background: "rgba(255, 255, 255, 0.1)",
                padding: "4px 8px",
                borderRadius: "12px",
                fontSize: "12px",
                marginLeft: "4px"
              }}>
                🎫 {userCredits.free + userCredits.paid} credits
              </span>
            )}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 10l5 5 5-5z" />
            </svg>
          </button>

          {showUserMenu && (
            <div className="user-dropdown">
              <div className="dropdown-header">
                <p className="user-name">{user.user_metadata?.full_name || "User"}</p>
                <p className="user-email">{user.email}</p>
              </div>
              <div className="dropdown-divider" />
              <button onClick={() => router.push("/recordings")} className="dropdown-item">
                My Recordings
              </button>
              <button
                className="dropdown-item"
                onClick={async () => {
                  await signOut();
                  router.push("/login");
                }}
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </nav>

      <main className="dashboard-main">
        {/* Left Panel - Input & Status */}
        <div className="panel">
          <div className="panel-header">Input & Status</div>
          <div className="panel-content">
            {/* Upload Button */}
            <button
              className={`upload-button ${isProcessing ? 'disabled' : ''}`}
              onClick={() => !isProcessing && inputRef.current?.click()}
              disabled={isProcessing}
              style={{ opacity: isProcessing ? 0.7 : 1, cursor: isProcessing ? 'not-allowed' : 'pointer' }}
            >
              {isProcessing ? (
                <>
                  <div className="loader" style={{ width: '18px', height: '18px', borderTopColor: '#fff', marginRight: '8px' }} />
                  Processing...
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  Upload Meeting Recording
                </>
              )}
            </button>

            <input
              ref={inputRef}
              type="file"
              accept={ALLOWED_EXTENSIONS.join(",")}
              onChange={handleFileInput}
              className="hidden"
              disabled={isProcessing}
            />

            {/* Drop Zone */}
            <div
              className={`upload-dropzone ${isDragging ? "dragging" : ""} ${isProcessing ? "disabled" : ""}`}
              onDragOver={handleDragOver}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => !isProcessing && inputRef.current?.click()}
              style={{
                opacity: isProcessing ? 0.5 : 1,
                pointerEvents: isProcessing ? 'none' : 'auto'
              }}
            >
              <p className="upload-dropzone-text">
                {isProcessing ? "Please wait..." : "Drag & Drop File or Click to Browse"}
              </p>
              {!isProcessing && (
                <p className="upload-hint" style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  *Max size: 50MB. Max duration: {getMaxDuration()} mins.
                </p>
              )}
            </div>

            {/* File List */}
            {files.length === 0 ? (
              <div className="file-list" style={{ textAlign: "center", paddingTop: "40px" }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: "0 auto 12px", color: "var(--text-muted)" }}>
                  <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p style={{ fontWeight: 500, color: "var(--text-secondary)", fontSize: "0.875rem" }}>No files uploaded yet.</p>
                <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginTop: "4px" }}>Start by uploading a meeting recording.</p>
              </div>
            ) : (
              <div className="file-list">
                <div className="file-list-header">
                  <span className="file-list-title">Recent Uploads</span>
                </div>
                {files.map(file => (
                  <div
                    key={file.id}
                    className={`file-item ${selectedFileId === file.id ? "active" : ""}`}
                    onClick={() => setSelectedFileId(file.id)}
                  >
                    <span className="file-item-name">{file.name}</span>
                    <div className={`file-item-status ${file.status}`}>
                      {file.status === "processing" && (
                        <>
                          <span>Processing... {file.progress}%</span>
                          <div className="progress-bar">
                            <div className="progress-bar-fill" style={{ width: `${file.progress}%` }} />
                          </div>
                        </>
                      )}
                      {file.status === "completed" && (
                        <>
                          <span>Completed</span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                          </svg>
                        </>
                      )}
                      {file.status === "error" && file.partialResult && (
                        <span className="badge badge-warning">Partial</span>
                      )}
                      {file.status === "error" && !file.partialResult && (
                        <span className="badge badge-error">Error</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Results */}
        <div className="panel">
          <div className="panel-header">Generated Summary & Insights</div>

          {/* Content logic remains mostly same but checked for proper structure */}
          <div className="panel-content" style={{ padding: 0 }}>
            {!selectedFile ? (
              <div className="empty-state">
                <svg className="empty-state-icon" viewBox="0 0 100 100" fill="none">
                  <ellipse cx="50" cy="85" rx="35" ry="8" fill="#2a3850" />
                  <path d="M25 50c0-13.8 11.2-25 25-25s25 11.2 25 25v5c0 5.5-4.5 10-10 10H35c-5.5 0-10-4.5-10-10v-5z" fill="#3a4a60" />
                  <path d="M35 45c0-8.3 6.7-15 15-15s15 6.7 15 15v10c0 2.8-2.2 5-5 5H40c-2.8 0-5-2.2-5-5V45z" fill="#4a5a70" />
                  <path d="M50 35l10 15H40l10-15z" fill="#4a9eff" />
                  <path d="M47 55h6v15h-6z" fill="#4a9eff" />
                  <rect x="30" y="65" width="40" height="5" rx="2" fill="#2a3850" />
                </svg>
                <h3 className="empty-state-title">Upload a meeting to generate summary and insights.</h3>
                <p className="empty-state-text">Drag & drop or click upload to get started.</p>
                <p className="empty-state-hint">*Max file size: 50MB</p>
              </div>
            ) : selectedFile.status === "processing" ? (
              <div className="empty-state">
                <div className="loader" style={{ width: "48px", height: "48px", marginBottom: "20px" }} />
                <h3 className="empty-state-title">Processing {selectedFile.name}...</h3>
                <p className="empty-state-text">This may take a few minutes depending on the file length.</p>
              </div>
            ) : selectedFile.status === "error" && !selectedFile.partialResult ? (
              <div className="empty-state">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="1.5" style={{ marginBottom: "16px" }}>
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4m0 4h.01" />
                </svg>
                <h3 className="empty-state-title" style={{ color: "var(--error)" }}>Processing Failed</h3>
                <p className="empty-state-text">{selectedFile.error}</p>
              </div>
            ) : (
              /* Result Content */
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div className="result-header-bar" style={{ borderRadius: 0 }}>
                  <span className="result-filename">{selectedFile.name}</span>
                  <div className="result-actions">
                    {selectedFile.result && (
                      <button className="btn btn-secondary btn-sm" onClick={downloadReport}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                        </svg>
                        Download Report
                      </button>
                    )}
                  </div>
                </div>

                {/* Partial Error Message */}
                {selectedFile.partialResult && (
                  <div style={{ padding: "20px" }}>
                    <div className="message message-warning" style={{ marginBottom: "16px" }}>
                      <strong>Transkripsi berhasil, tapi ringkasan gagal.</strong>
                      <p style={{ marginTop: "8px", fontSize: "0.8125rem" }}>{selectedFile.partialResult.error}</p>
                    </div>
                    <button
                      className="btn btn-primary"
                      onClick={handleRetrySummarization}
                      disabled={isRetrying}
                      style={{ width: "100%" }}
                    >
                      {isRetrying ? (
                        <><div className="loader loader-small" /> Retrying...</>
                      ) : (
                        <>🔄 Retry Ringkasan (GRATIS)</>
                      )}
                    </button>
                  </div>
                )}

                <div className="result-content" style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
                  {/* Show Partial Transcript if present */}
                  {selectedFile.partialResult && (
                    <div className="result-section">
                      <div className="result-section-header" onClick={() => toggleSection("transcript")}>
                        <span className="result-section-title">Transcript (Raw)</span>
                        <svg className={`result-section-toggle ${openSections.transcript ? "open" : ""}`} width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M7 10l5 5 5-5z" />
                        </svg>
                      </div>
                      {openSections.transcript && (
                        <div className="result-section-content">
                          {selectedFile.partialResult.transcript}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Full Result Sections */}
                  {selectedFile.result && (
                    <>
                      {/* Executive Summary */}
                      <div className="result-section">
                        <div className="result-section-header" onClick={() => toggleSection("summary")}>
                          <span className="result-section-title">Executive Summary</span>
                          <svg className={`result-section-toggle ${openSections.summary ? "open" : ""}`} width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M7 10l5 5 5-5z" />
                          </svg>
                        </div>
                        {openSections.summary && (
                          <div className="result-section-content">
                            {selectedFile.result.summary.ringkasan_singkat}
                          </div>
                        )}
                      </div>

                      {/* Key Points */}
                      <div className="result-section">
                        <div className="result-section-header" onClick={() => toggleSection("keyPoints")}>
                          <span className="result-section-title">Key Points</span>
                          <svg className={`result-section-toggle ${openSections.keyPoints ? "open" : ""}`} width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M7 10l5 5 5-5z" />
                          </svg>
                        </div>
                        {openSections.keyPoints && (
                          <div className="result-section-content">
                            {selectedFile.result.summary.poin_penting.map((point, idx) => (
                              <div key={idx} className="key-point">
                                <div className="key-point-bullet" />
                                <span>{point}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Action Items */}
                      <div className="result-section">
                        <div className="result-section-header" onClick={() => toggleSection("actionItems")}>
                          <span className="result-section-title">Action Items</span>
                          <svg className={`result-section-toggle ${openSections.actionItems ? "open" : ""}`} width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M7 10l5 5 5-5z" />
                          </svg>
                        </div>
                        {openSections.actionItems && (
                          <div className="result-section-content">
                            {selectedFile.result.summary.action_items.length > 0 ? (
                              selectedFile.result.summary.action_items.map((item, idx) => (
                                <div key={idx} className="action-item">
                                  <div className="action-item-checkbox" />
                                  <span className="action-item-text">{item}</span>
                                </div>
                              ))
                            ) : (
                              <p style={{ color: "var(--text-muted)" }}>Tidak ada action items terdeteksi.</p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Transcript */}
                      <div className="result-section">
                        <div className="result-section-header" onClick={() => toggleSection("transcript")}>
                          <span className="result-section-title">Transcript (Raw)</span>
                          <svg className={`result-section-toggle ${openSections.transcript ? "open" : ""}`} width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M7 10l5 5 5-5z" />
                          </svg>
                        </div>
                        {openSections.transcript && (
                          <div className="result-section-content" style={{ whiteSpace: "pre-wrap", textAlign: "justify" }}>
                            {selectedFile.result.transcript}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
