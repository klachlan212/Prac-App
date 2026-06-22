import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Prac.',
  description: 'A placement companion for Australian nursing students.',
  manifest: '/manifest.json',
  icons: { icon: '/icon.svg', shortcut: '/icon.svg', apple: '/icon.svg' },
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Prac.' },
}

export const viewport: Viewport = {
  themeColor: '#f6f4ef',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen font-sans text-ink antialiased">
        {/* Fonts via stylesheet link (no build-time fetch). React hoists these to <head>. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Intentional <link> (not next/font): a build-time font fetch can be blocked by
            the sandbox egress allowlist, breaking local `verify`. eslint-disable-next-line */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Mono:wght@400;500&display=swap"
        />
        {children}
      </body>
    </html>
  )
}
