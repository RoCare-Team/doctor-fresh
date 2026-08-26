import { Inter } from 'next/font/google';
import { SITE_URL, SITE_INDEXABLE } from '@/lib/utils';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

/**
 * The document shell only.
 *
 * The shop's header, footer and cart live in app/(shop)/layout.jsx, and the
 * admin area has its own frame — neither should appear on the other, which is
 * why this layout renders nothing but the page.
 */
export const metadata = {
  metadataBase: new URL(SITE_URL),
  robots: SITE_INDEXABLE
    ? { index: true, follow: true }
    : { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false, noimageindex: true } },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1597c5',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
