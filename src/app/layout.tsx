import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PWARegister } from "@/components/pwa-register";
import { ConnectionStatus } from "@/components/connection-status";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || "http://localhost:3000"),
  title: "Nutrición Andrés",
  description: "Nutrición, entrenamiento y progreso personal.",
  applicationName: "Nutrición Andrés",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Andrés" },
  formatDetection: { telephone: false },
  openGraph: { title: "Nutrición Andrés", description: "Tu nutrición, entrenamiento y progreso.", type: "website" },
  twitter: { card: "summary_large_image", title: "Nutrición Andrés", description: "Tu nutrición, entrenamiento y progreso." },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#0a4b3b" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><PWARegister /><ConnectionStatus />{children}</body>
    </html>
  );
}
