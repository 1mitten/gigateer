import { Inter } from 'next/font/google';
import './globals.css';
import { PWAProvider } from '../components/pwa-provider';
import { ToastProvider } from '../components/ui/Toast';
import { QueryProvider } from '../providers/QueryProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Gigateer - Live Music Discovery',
  description: 'Discover live music events and gigs in your area',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Gigateer',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-touch-fullscreen': 'yes',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#6366f1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#6366f1" />
        <meta name="background-color" content="#ffffff" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512x512.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Gigateer" />
      </head>
      <body className={inter.className}>
        <QueryProvider>
          <ToastProvider>
            <div className="min-h-screen bg-gray-50">
              {children}
            </div>
          </ToastProvider>
        </QueryProvider>
      </body>
    </html>
  );
}