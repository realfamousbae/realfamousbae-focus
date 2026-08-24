import type { Metadata } from 'next';
import { Geist_Mono } from 'next/font/google';
import './globals.css';

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin', 'cyrillic'],
});

export const metadata: Metadata = {
  title: 'realfamousbae focus — countdowns that matter',
  description: 'Живые таймеры до важных событий. Синхронизация через ChatGPT.',
  openGraph: {
    title: 'realfamousbae focus',
    description: 'Countdowns that matter — beautiful live timers, synced through ChatGPT.',
    type: 'website',
    images: [{ url: '/og.png', width: 1731, height: 909, alt: 'realfamousbae focus — countdowns that matter' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'realfamousbae focus',
    description: 'Countdowns that matter — beautiful live timers, synced through ChatGPT.',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body className={geistMono.variable}>{children}</body>
    </html>
  );
}
