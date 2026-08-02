import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Literature Management System',
  description: 'Multi-congregation literature stock management',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
