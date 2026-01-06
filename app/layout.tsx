import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { ToasterProvider } from "@/components/common/ToasterProvider"
import { AssistantWrapper } from "@/components/AssistantWrapper"
import { GridBackground } from "@/components/common/GridBackground"
import Footer from "@/components/common/Footer"

export const metadata: Metadata = {
  title: "AI Academy - Attendance Tracker",
  description: "AI-powered attendance tracking system for AI Academy. Track attendance with QR codes, manage check-ins, and analyze attendance statistics.",
  keywords: ["AI Academy", "attendance tracker", "QR code check-in", "attendance management", "education technology"],
  authors: [{ name: "Intellibus" }],
  creator: "Intellibus",
  publisher: "Intellibus",
  generator: "Next.js",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://attendance.intellibus.academy'),
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any", type: "image/x-icon" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      { url: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ],
  },
  manifest: "/site.webmanifest",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  openGraph: {
    title: "AI Academy - Attendance Tracker",
    description: "AI-powered attendance tracking system for AI Academy. Track attendance with QR codes, manage check-ins, and analyze attendance statistics.",
    type: "website",
    locale: "en_US",
    siteName: "AI Academy",
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://attendance.intellibus.academy',
    images: [
      {
        url: "/intellibus-logo.png",
        width: 1200,
        height: 630,
        alt: "AI Academy Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Academy - Attendance Tracker",
    description: "AI-powered attendance tracking system for AI Academy. Track attendance with QR codes, manage check-ins, and analyze attendance statistics.",
    images: ["/intellibus-logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning={true}>
      <body className="harmonia-sans h-full text-foreground antialiased bg-background">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <div className="min-h-screen w-full relative">
            <GridBackground />
            <div className="absolute inset-0 z-[1] bg-black/50 dark:block hidden" />
            <div className="relative z-10 flex flex-col min-h-screen bg-transparent">
              <AssistantWrapper>
                <main className="flex-1 bg-transparent">
                  {children}
                </main>
                <Footer />
                <ToasterProvider />
              </AssistantWrapper>
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}

