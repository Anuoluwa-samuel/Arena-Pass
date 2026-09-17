import type { Metadata } from 'next'
import { Barlow_Condensed, DM_Mono, Manrope } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

// Barlow Condensed is the stadium-board display face for headlines; Manrope is
// the readable body; DM Mono is the uppercase "/LABEL" voice and ticket numbers.
const display = Barlow_Condensed({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-barlow', display: 'swap' })
const sans = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap' })
const mono = DM_Mono({ subsets: ['latin'], weight: ['300', '400', '500'], variable: '--font-dm-mono', display: 'swap' })

export const metadata: Metadata = {
  title: { default: 'Arena Pass — Football Session Tickets', template: '%s · Arena Pass' },
  description: 'Book a slot in organised 8-team football sessions. Secure payment, instant digital ticket, QR entry.',
  applicationName: 'Arena Pass',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    // suppressHydrationWarning: next-themes writes the theme class onto <html>
    // from an inline script before hydration, so the server markup won't match.
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster position="top-center" richColors closeButton />
        </ThemeProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
