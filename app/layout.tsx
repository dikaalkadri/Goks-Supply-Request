import type { Metadata, Viewport } from 'next';
import { Toaster } from 'react-hot-toast';
import PwaRegistrar from '@/components/pwa/PwaRegistrar';
import './globals.css';

export const metadata: Metadata = {
  title: 'Goks! Supply Request',
  description: 'Platform digital untuk mengajukan dan mengelola permintaan barang outlet secara mudah dan terpusat.',
  keywords: 'permintaan barang, supply request, outlet, manajemen barang',
  applicationName: 'Goks! Supply Request',
  appleWebApp: { capable: true, title: 'Goks! Supply', statusBarStyle: 'default' },
  icons: { icon: '/icon-192.png', apple: '/apple-touch-icon.png' },
};

export const viewport: Viewport = {
  themeColor: '#6113a7',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body className="min-h-screen bg-slate-50">
        {children}
        <PwaRegistrar />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1e293b',
              color: '#f8fafc',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: '500',
              padding: '12px 16px',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#f8fafc' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#f8fafc' } },
          }}
        />
      </body>
    </html>
  );
}
