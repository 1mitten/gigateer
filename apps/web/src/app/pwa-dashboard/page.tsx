import { Metadata } from 'next';
import { PWADashboard } from '../../components/pwa-dashboard';

export const metadata: Metadata = {
  title: 'PWA Dashboard - Gigateer',
  description: 'Monitor and test Progressive Web App features for Gigateer',
  robots: 'noindex, nofollow', // Keep this internal
};

export default function PWADashboardPage() {
  return <PWADashboard />;
}