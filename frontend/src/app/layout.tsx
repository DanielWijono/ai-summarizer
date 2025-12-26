import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

const inter = Inter({ subsets: ["latin"] });


export const metadata: Metadata = {
  title: {
    default: "AI Summarizer - Ubah Meeting Jadi Notes & Action Items",
    template: "%s | AI Summarizer"
  },
  description: "Tools AI untuk merangkum rekaman meeting video & audio menjadi transkrip, poin penting, dan action items secara otomatis dalam bahasa Indonesia & Inggris.",
  keywords: ["AI Summarizer", "Meeting Notes", "Transkrip Otomatis", "Rangkuman Meeting", "Notulen AI"],
  authors: [{ name: "Daniel Wijono" }],
  creator: "Daniel Wijono",
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "https://aivideosummarizernote.netlify.app",
    title: "AI Summarizer - Ubah Meeting Jadi Notes & Action Items",
    description: "Tools AI untuk merangkum rekaman meeting video & audio menjadi transkrip, poin penting, dan action items secara otomatis.",
    siteName: "AI Summarizer",
    images: [
      {
        url: "/og-image.jpg", // We should add this later or use a generic one
        width: 1200,
        height: 630,
        alt: "AI Summarizer Preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Summarizer - Ubah Meeting Jadi Notes & Action Items",
    description: "Rangkum meeting otomatis dengan AI. Coba gratis sekarang!",
    // images: ["/twitter-image.jpg"],
  },
  alternates: {
    canonical: "https://aivideosummarizernote.netlify.app",
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
