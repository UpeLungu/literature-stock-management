import type { Metadata } from 'next';
import './globals.css';
import './panel-fix.css';
import './responsive-admin-fix.css';
import './mobile-drawer.css';
import './safe-enhancements.css';
import './publication-search-position.css';
import './stock-count-tools.css';
import './auth.css';
import './quantity-dialog.css';
import MobileDrawerController from './MobileDrawerController';
import SafeCloudWriter from './SafeCloudWriter';
import AuthGate from './AuthGate';

export const metadata: Metadata = {
  title: 'Literature Management System',
  description: 'Multi-congregation literature stock management',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AuthGate>
          <MobileDrawerController />
          <SafeCloudWriter />
          {children}
        </AuthGate>
      </body>
    </html>
  );
}
