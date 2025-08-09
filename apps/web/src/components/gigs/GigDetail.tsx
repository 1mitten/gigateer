import React from 'react';
import Link from 'next/link';
import { Gig } from '@gigateer/contracts';
import { 
  MapPinIcon, 
  CalendarIcon, 
  ClockIcon, 
  TicketIcon,
  LinkIcon,
  ArrowLeftIcon,
  ShareIcon,
  UserGroupIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';

interface GigDetailProps {
  gig: Gig;
  onBack?: () => void;
}

export function GigDetail({ gig, onBack }: GigDetailProps) {
  // Color palette for tags
  const tagColors = ['#A3DC9A', '#DEE791', '#FFF9BD', '#FFD6BA'];
  
  // Helper function to get color for tag
  const getTagColor = (index: number) => {
    const colorIndex = index % tagColors.length;
    return tagColors[colorIndex];
  };
  
  // Helper function to get text color based on background
  const getTextColor = (backgroundColor: string) => {
    // Light colors, use dark text
    return '#374151'; // gray-700
  };
  
  const gigDate = new Date(gig.dateStart);
  const gigEndDate = gig.dateEnd ? new Date(gig.dateEnd) : null;
  const isUpcoming = gigDate >= new Date();
  
  const formattedDate = format(gigDate, 'EEEE, MMMM d, yyyy');
  const formattedTime = format(gigDate, 'h:mm a');
  const formattedEndTime = gigEndDate ? format(gigEndDate, 'h:mm a') : null;


  const getStatusInfo = () => {
    if (gig.status === 'cancelled') {
      return {
        badge: (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
            Event Cancelled
          </span>
        ),
        className: 'opacity-75'
      };
    }
    
    if (gig.status === 'postponed') {
      return {
        badge: (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
            Event Postponed
          </span>
        ),
        className: 'opacity-75'
      };
    }
    
    if (!isUpcoming) {
      return {
        badge: (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
            Past Event
          </span>
        ),
        className: 'opacity-75'
      };
    }

    return { badge: null, className: '' };
  };

  const statusInfo = getStatusInfo();

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: gig.title,
          text: `Check out this gig: ${gig.title} at ${gig.venue.name}`,
          url: window.location.href,
        });
      } catch (error) {
        // Fallback to clipboard
        copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      // You could show a toast here
      console.log('Link copied to clipboard');
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            {/* Back button */}
            <div className="mb-6">
              {onBack ? (
                <button
                  onClick={onBack}
                  className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-sm px-1"
                >
                  <ArrowLeftIcon className="h-4 w-4 mr-2" />
                  Back to search
                </button>
              ) : (
                <Link
                  href="/"
                  className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-sm px-1"
                >
                  <ArrowLeftIcon className="h-4 w-4 mr-2" />
                  Back to search
                </Link>
              )}
            </div>

            {/* Title and status */}
            <div className={`${statusInfo.className}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                    {gig.title}
                  </h1>
                  
                  {gig.artists.length > 0 && (
                    <div className="flex items-center text-lg text-gray-600 mb-2">
                      <UserGroupIcon className="h-5 w-5 mr-2 flex-shrink-0" />
                      <span>{gig.artists.join(', ')}</span>
                    </div>
                  )}
                </div>
                
                <div className="ml-4 flex items-center gap-2">
                  {statusInfo.badge}
                  
                  <button
                    onClick={handleShare}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
                    title="Share this event"
                  >
                    <ShareIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Date and venue info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center text-gray-700 mb-2">
                    <CalendarIcon className="h-5 w-5 mr-3 flex-shrink-0 text-primary-500" />
                    <span className="font-medium">{formattedDate}</span>
                  </div>
                  
                  <div className="flex items-center text-gray-700 mb-2">
                    <ClockIcon className="h-5 w-5 mr-3 flex-shrink-0 text-primary-500" />
                    <span>
                      {formattedTime}
                      {formattedEndTime && ` - ${formattedEndTime}`}
                      {gig.timezone && (
                        <span className="text-sm text-gray-500 ml-2">
                          ({gig.timezone})
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center text-gray-700 mb-2">
                    <BuildingOfficeIcon className="h-5 w-5 mr-3 flex-shrink-0 text-primary-500" />
                    <span className="font-medium">{gig.venue.name}</span>
                  </div>
                  
                  {(gig.venue.address || gig.venue.city) && (
                    <div className="flex items-start text-gray-700">
                      <MapPinIcon className="h-5 w-5 mr-3 flex-shrink-0 text-primary-500 mt-0.5" />
                      <span>
                        {gig.venue.address && (
                          <>
                            {gig.venue.address}
                            {gig.venue.city && <br />}
                          </>
                        )}
                        {gig.venue.city && gig.venue.country && `${gig.venue.city}, ${gig.venue.country}`}
                        {gig.venue.city && !gig.venue.country && gig.venue.city}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Event image (if available) */}
            {gig.images.length > 0 && (
              <div className="card overflow-hidden">
                <img
                  src={gig.images[0]}
                  alt={gig.title}
                  className="w-full h-64 sm:h-80 object-contain bg-gray-100"
                  onError={(e) => {
                    // Fallback to object-cover if object-contain fails
                    const img = e.target as HTMLImageElement;
                    img.className = "w-full h-64 sm:h-80 object-cover";
                  }}
                />
              </div>
            )}

            {/* Tags */}
            {((gig.tags && gig.tags.length > 0) || ((gig as any).genre && (gig as any).genre.length > 0)) && (
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Tags
                </h2>
                <div className="flex flex-wrap gap-2">
                  {(gig.tags || (gig as any).genre || []).map((tag: string, index: number) => {
                    const backgroundColor = getTagColor(index);
                    const textColor = getTextColor(backgroundColor);
                    return (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                        style={{ backgroundColor, color: textColor }}
                      >
                        {tag}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Additional images */}
            {gig.images.length > 1 && (
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  More Photos
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {gig.images.slice(1).map((image, index) => (
                    <img
                      key={index}
                      src={image}
                      alt={`${gig.title} - Image ${index + 2}`}
                      className="w-full h-32 object-cover rounded-md"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Source info */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Event Information
              </h2>
              <div className="space-y-2 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Source:</span> {gig.source}
                </div>
                <div>
                  <span className="font-medium">Last Updated:</span>{' '}
                  {format(new Date(gig.updatedAt), 'MMM d, yyyy h:mm a')}
                </div>
                {gig.sourceId && (
                  <div>
                    <span className="font-medium">Source ID:</span> {gig.sourceId}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Ticket info */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Tickets
              </h2>
              
              <div className="space-y-4">
                {gig.ageRestriction && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Age Restriction:</span> {gig.ageRestriction}
                  </div>
                )}

                {gig.status === 'scheduled' && isUpcoming && (
                  <div className="space-y-2">
                    {gig.ticketsUrl && (
                      <a
                        href={gig.ticketsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full btn-primary flex items-center justify-center gap-2"
                      >
                        <TicketIcon className="h-4 w-4" />
                        Get Tickets
                      </a>
                    )}
                    
                    {gig.eventUrl && (
                      <a
                        href={gig.eventUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full btn-secondary flex items-center justify-center gap-2"
                      >
                        <LinkIcon className="h-4 w-4" />
                        View on {gig.source}
                      </a>
                    )}
                  </div>
                )}

                {(gig.status !== 'scheduled' || !isUpcoming) && (
                  <div className="text-sm text-gray-500 text-center py-2">
                    {gig.status === 'cancelled' ? 'Event has been cancelled' :
                     gig.status === 'postponed' ? 'Event has been postponed' :
                     'This event has already passed'}
                  </div>
                )}
              </div>
            </div>

            {/* Venue details */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Venue
              </h2>
              
              <div className="space-y-2">
                <h3 className="font-medium">{gig.venue.name}</h3>
                
                {gig.venue.address && (
                  <div className="text-sm text-gray-600">
                    {gig.venue.address}
                  </div>
                )}
                
                {gig.venue.city && (
                  <div className="text-sm text-gray-600">
                    {gig.venue.city}
                    {gig.venue.country && `, ${gig.venue.country}`}
                  </div>
                )}

                {/* Map placeholder - you could integrate with Google Maps or similar */}
                {gig.venue.lat && gig.venue.lng && (
                  <div className="mt-4">
                    <div className="bg-gray-200 h-32 rounded-md flex items-center justify-center text-gray-500 text-sm">
                      Map View
                      <br />
                      ({gig.venue.lat}, {gig.venue.lng})
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}