import type { Metadata } from 'next';
import './globals.css';
import './panel-fix.css';
import './responsive-admin-fix.css';
import './mobile-drawer.css';
import './safe-enhancements.css';
import './publication-search-position.css';
import './stock-count-tools.css';
import MobileDrawerController from './MobileDrawerController';
import SafeCloudWriter from './SafeCloudWriter';

export const metadata: Metadata = {
  title: 'Literature Management System',
  description: 'Multi-congregation literature stock management',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <MobileDrawerController />
        <SafeCloudWriter />
        {children}
      </body>
    </html>
  );
}
