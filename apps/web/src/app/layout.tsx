import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AI Support Platform',
  description: 'AI-powered customer support platform dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={poppins.variable}>
        <head>
          <link rel="preconnect" href="https://prod.spline.design" />
          <link rel="dns-prefetch" href="https://prod.spline.design" />
        </head>
        <body className="min-h-screen bg-[#0d0d0d] text-neutral-100 antialiased font-sans">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
