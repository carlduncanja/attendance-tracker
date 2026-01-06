import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { ToasterProvider } from "@/components/common/ToasterProvider"
import { AssistantWrapper } from "@/components/AssistantWrapper"
import { GridBackground } from "@/components/common/GridBackground"

export const metadata: Metadata = {
  title: "AI Academy",
  description: "AI Academy Attendance Tracking System",
  generator: "Cursor",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any", type: "image/x-icon" },
    ],
  },
  openGraph: {
    title: "AI Academy",
    description: "AI Academy Attendance Tracking System",
    type: "website",
    locale: "en_US",
    siteName: "AI Academy",
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
                <ToasterProvider />
              </AssistantWrapper>
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}

