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
import './ui-polish.css';
import './submission-success.css';
import MobileDrawerController from './MobileDrawerController';
import SafeCloudWriter from './SafeCloudWriter';
import AuthGate from './AuthGate';
import SubmissionSuccessController from './SubmissionSuccessController';

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
          <SubmissionSuccessController />
          {children}
        </AuthGate>
      </body>
    </html>
  );
}
