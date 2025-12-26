"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import Image from "next/image";

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const currentYear = new Date().getFullYear();

  if (loading) {
    return (
      <div className="auth-container">
        <div className="loader" style={{ width: "48px", height: "48px" }} />
      </div>
    );
  }

  if (user) {
    router.replace("/dashboard");
    return null; // Prevent flicker
  }

  return (
    <div className="landing-page">
      <nav className="landing-nav">
        <div className="navbar-brand">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
          </svg>
          AI Summarizer
        </div>
        <div className="landing-nav-links">
          <a href="#features" className="landing-nav-link">Fitur</a>
          <a href="#how-it-works" className="landing-nav-link">Cara Kerja</a>
          <a href="#pricing" className="landing-nav-link">Harga</a>
        </div>
        <div className="landing-nav-actions">
          <Link href="/login" className="btn btn-secondary btn-sm" style={{ marginRight: "12px" }}>
            Masuk
          </Link>
          <Link href="/register" className="btn btn-primary btn-sm">
            Daftar Gratis
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="hero-section">
        <div className="hero-badge">
          <span className="badge-dot">✨</span>
          <span>AI-Powered Meeting Assistant</span>
        </div>
        <h1 className="hero-title">
          Ubah Meeting Jadi Notes &<br />Action Items Instan
        </h1>
        <p className="hero-subtitle">
          Tidak perlu lagi mencatat manual. Upload rekaman meeting Anda,
          biarkan AI membuat transkrip dan rangkuman poin penting dalam hitungan detik.
        </p>
        <div className="hero-cta-group">
          <Link href="/register" className="btn btn-primary btn-lg">
            Coba Gratis Sekarang
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
            </svg>
          </Link>
          <Link href="#how-it-works" className="btn btn-secondary btn-lg">
            Pelajari Cara Kerja
          </Link>
        </div>
      </header>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="section-header">
          <h2 className="section-title">Kenapa AI Summarizer?</h2>
          <p className="section-subtitle">
            Hemat waktu produktif Anda dengan otomatisasi catatan meeting yang cerdas.
          </p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
              </svg>
            </div>
            <h3 className="feature-title">Transkrip Otomatis</h3>
            <p className="feature-desc">
              Mendukung bahasa Indonesia & Inggris dengan akurasi tinggi. Deteksi pembicara otomatis.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13 11h-2v3H8v2h3v3h2v-3h3v-2h-3zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
            </div>
            <h3 className="feature-title">Smart Summary</h3>
            <p className="feature-desc">
              Dapatkan ringkasan eksekutif, poin-poin penting, dan keputusan meeting tanpa membaca seluruh transkrip.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            </div>
            <h3 className="feature-title">Action Items Detector</h3>
            <p className="feature-desc">
              AI secara otomatis mengenali tugas dan tanggung jawab yang dibahas, sehingga tidak ada to-do list yang terlewat.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="steps-section">
        <div className="section-header">
          <h2 className="section-title">Cara Kerja</h2>
          <p className="section-subtitle">3 langkah mudah untuk mendapatkan notulen meeting yang sempurna.</p>
        </div>

        <div className="steps-grid">
          <div className="step-card">
            <div className="step-number">1</div>
            <h3 className="step-title">Upload Rekaman</h3>
            <p className="step-desc">Upload file video/audio meeting Anda (Zoom, Google Meet, dll).</p>
          </div>
          <div className="step-card">
            <div className="step-number">2</div>
            <h3 className="step-title">AI Memproses</h3>
            <p className="step-desc">Sistem kami mentranskrip dan menganalisa isi percakapan dengan cepat.</p>
          </div>
          <div className="step-card">
            <div className="step-number">3</div>
            <h3 className="step-title">Download Hasil</h3>
            <p className="step-desc">Dapatkan notulen lengkap, ringkasan, dan action items siap pakai.</p>
          </div>
        </div>
      </section>

      {/* Pricing Snippet */}
      <section id="pricing" className="landing-pricing">
        <div className="section-header">
          <h2 className="section-title">Pilihan Paket Hemat</h2>
          <p className="section-subtitle">Mulai dari gratis, upgrade kapan saja sesuai kebutuhan.</p>
          <div style={{ marginTop: "32px" }}>
            <Link href="/pricing" className="btn btn-secondary btn-lg">
              Lihat Detail Harga
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
          </svg>
          AI Summarizer
        </div>
        <p className="footer-copyright">
          &copy; {currentYear} AI Summarizer. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
