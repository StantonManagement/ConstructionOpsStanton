import { Suspense } from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/providers/AuthProvider";
import { ReactQueryProvider } from "@/providers/ReactQueryProvider";
import { ModalProvider } from "@/context/ModalContext";
import { ProjectProvider } from "@/context/ProjectContext";
import { PortfolioProvider } from "@/context/PortfolioContext";
import ErrorBoundary from "./components/ErrorBoundary";
import AppLayout from "@/app/components/AppLayout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Construction Ops - Stanton",
  description: "Professional construction operations management platform",
  keywords: "construction, project management, payment processing",
  robots: "index, follow",
  openGraph: {
    title: "Construction Ops - Stanton",
    description: "Professional construction operations management platform",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorBoundary>
          <ReactQueryProvider>
            <AuthProvider>
              <Suspense fallback={null}>
                <PortfolioProvider>
                  <ProjectProvider>
                    <ModalProvider>
                      {children}
                    </ModalProvider>
                  </ProjectProvider>
                </PortfolioProvider>
              </Suspense>
            </AuthProvider>
          </ReactQueryProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
