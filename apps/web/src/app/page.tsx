import { Metadata } from 'next';
import ClientOnlySearchPage from '../components/ClientOnlySearchPage';

export const metadata: Metadata = {
  title: 'Gigateer - Discover Live Music',
  description: 'Find gigs, concerts, and festivals near you. Discover live music events from venues across the UK.',
};

export default function HomePage() {
  return <ClientOnlySearchPage />;
}