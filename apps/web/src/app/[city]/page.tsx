import { SearchPage } from '../../components/pages/SearchPage';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import dynamic from 'next/dynamic';

interface CityPageProps {
  params: {
    city: string;
  };
}

// Common cities that should be supported (can be expanded)
const SUPPORTED_CITIES = [
  'bristol',
  'london',
  'manchester',
  'birmingham',
  'liverpool',
  'leeds',
  'glasgow',
  'edinburgh',
  'cardiff',
  'belfast',
  'newcastle',
  'sheffield',
  'nottingham',
  'brighton',
  'oxford',
  'cambridge',
  'bath',
  'york'
];

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const city = decodeURIComponent(params.city).toLowerCase();
  const cityName = city.charAt(0).toUpperCase() + city.slice(1);
  
  return {
    title: `${cityName} Gigs & Live Music | Gigateer`,
    description: `Discover live music, concerts, and gigs in ${cityName}. Find upcoming events and venues in ${cityName} with Gigateer.`,
    openGraph: {
      title: `${cityName} Gigs & Live Music`,
      description: `Find the best live music events in ${cityName}`,
    },
  };
}

export default function CityPage({ params }: CityPageProps) {
  const city = decodeURIComponent(params.city).toLowerCase();
  
  // Check if city is supported (optional - you can remove this check to allow any city)
  if (!SUPPORTED_CITIES.includes(city)) {
    notFound();
  }
  
  // Dynamically import SearchPage to ensure proper client-side rendering
  const DynamicSearchPage = dynamic(
    () => import('../../components/pages/SearchPage').then(mod => ({ default: mod.SearchPage })), 
    { ssr: false }
  );
  
  // Pass the city to SearchPage component
  return <DynamicSearchPage city={city} />;
}

// For static generation of common cities (optional)
export async function generateStaticParams() {
  return SUPPORTED_CITIES.map((city) => ({
    city: city,
  }));
}