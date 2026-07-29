import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { DocumentSessionProvider } from "@/lib/document-session-context";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Document Explainer",
  description: "Understand any document in under a minute.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <DocumentSessionProvider>{children}</DocumentSessionProvider>
      </body>
    </html>
  );
}
