import type { Metadata } from 'next';
import './globals.css';
import './panel-fix.css';
import './responsive-admin-fix.css';
import './mobile-drawer.css';
import './month-workflow.css';
import MobileDrawerController from './MobileDrawerController';
import MonthWorkflow from './MonthWorkflow';

export const metadata: Metadata = {
  title: 'Literature Management System',
  description: 'Multi-congregation literature stock management',
};

const monthlyStorageBootstrap = `
(function () {
  try {
    var date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - 1);
    var due = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
    var selected = window.localStorage.getItem('lms-selected-period') || due;
    window.localStorage.setItem('lms-selected-period', selected);

    var originalGet = Storage.prototype.getItem;
    var originalSet = Storage.prototype.setItem;
    var originalRemove = Storage.prototype.removeItem;
    var scopedKey = function (key) {
      return key === 'lms-counts-v3' ? key + ':' + selected : key;
    };

    var monthlyKey = scopedKey('lms-counts-v3');
    if (originalGet.call(window.localStorage, monthlyKey) === null) {
      var legacy = originalGet.call(window.localStorage, 'lms-counts-v3');
      if (legacy !== null) originalSet.call(window.localStorage, monthlyKey, legacy);
    }

    Storage.prototype.getItem = function (key) { return originalGet.call(this, scopedKey(key)); };
    Storage.prototype.setItem = function (key, value) { return originalSet.call(this, scopedKey(key), value); };
    Storage.prototype.removeItem = function (key) { return originalRemove.call(this, scopedKey(key)); };
  } catch (error) {
    console.warn('Monthly stock period bootstrap failed', error);
  }
})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: monthlyStorageBootstrap }} />
      </head>
      <body>
        <MobileDrawerController />
        <MonthWorkflow />
        {children}
      </body>
    </html>
  );
}
