import { Inter } from 'next/font/google';
import './globals.css';
import { SessionProvider } from '@/src/contexts/SessionContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Needha Gold',
  description: 'Needha Gold ERP System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
} 