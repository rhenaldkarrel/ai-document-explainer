import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { SettingsDialog } from "@/components/settings-dialog";
import { SiteFooter } from "@/components/site-footer";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { DocumentSessionProvider } from "@/lib/document-session-context";
import { SettingsProvider } from "@/lib/settings-context";
import "./globals.css";

const fontDisplay = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600"],
});

const fontBody = IBM_Plex_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const fontData = IBM_Plex_Mono({
  variable: "--font-data",
  subsets: ["latin"],
  weight: ["400", "500"],
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
      suppressHydrationWarning
      className={`${fontDisplay.variable} ${fontBody.variable} ${fontData.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          <SettingsProvider>
            <DocumentSessionProvider>
              <div className="fixed top-4 right-4 z-40 flex items-center gap-2">
                <ThemeToggle />
                <SettingsDialog />
              </div>
              <div className="flex flex-1 flex-col">{children}</div>
              <SiteFooter />
            </DocumentSessionProvider>
          </SettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
