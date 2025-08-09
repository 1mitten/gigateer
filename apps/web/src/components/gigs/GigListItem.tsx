import React from 'react';
import Link from 'next/link';
import { Gig } from '@gigateer/contracts';
import { 
  MapPinIcon, 
  CalendarIcon, 
  ClockIcon, 
  TicketIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';

interface GigListItemProps {
  gig: Gig;
  className?: string;
  priority?: boolean;
}

export function GigListItem({ gig, className = "", priority = false }: GigListItemProps) {
  // Color palette for tags (same as GigCard)
  const tagColors = ['#A3DC9A', '#DEE791', '#FFF9BD', '#FFD6BA'];
  
  // Helper function to get color for tag
  const getTagColor = (index: number) => {
    const colorIndex = index % tagColors.length;
    return tagColors[colorIndex];
  };
  
  // Helper function to get text color based on background
  const getTextColor = (backgroundColor: string) => {
    return '#374151'; // gray-700
  };

  // Helper function to safely parse and validate dates
  const parseGigDate = (dateString: string): Date | null => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return null;
      }
      return date;
    } catch {
      return null;
    }
  };

  const gigDate = parseGigDate(gig.dateStart);
  const isValidDate = gigDate !== null;
  const isUpcoming = isValidDate ? gigDate >= new Date() : true;
  
  // Format date and time with fallbacks
  const formattedDate = isValidDate ? format(gigDate, 'MMM d, yyyy') : 'Date TBA';
  const formattedTime = isValidDate ? format(gigDate, 'h:mm a') : (
    gig.dateStart.includes(':') ? gig.dateStart.trim() : 'Time TBA'
  );

  const getStatusBadge = () => {
    if (gig.status === 'cancelled') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
          Cancelled
        </span>
      );
    }
    
    if (gig.status === 'postponed') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
          Postponed
        </span>
      );
    }
    
    if (!isUpcoming) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
          Past Event
        </span>
      );
    }

    return null;
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200 ${className}`}>
      <div className="flex items-start justify-between">
        {/* Left side: Event details */}
        <div className="flex-1 min-w-0">
          {/* Title and status */}
          <div className="flex items-start justify-between mb-2">
            <Link 
              href={`/gig/${gig.id}`}
              className="group flex-1"
            >
              <h3 className="text-base font-semibold text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-1">
                {gig.title}
              </h3>
            </Link>
            
            {getStatusBadge() && (
              <div className="ml-2 flex-shrink-0">
                {getStatusBadge()}
              </div>
            )}
          </div>

          {/* Date, time, and venue in one line */}
          <div className="flex items-center text-sm text-gray-600 mb-2 flex-wrap gap-x-4 gap-y-1">
            <div className="flex items-center">
              <CalendarIcon className="h-4 w-4 mr-1 flex-shrink-0" />
              <span>{formattedDate}</span>
            </div>
            
            <div className="flex items-center">
              <ClockIcon className="h-4 w-4 mr-1 flex-shrink-0" />
              <span>{formattedTime}</span>
            </div>
            
            <div className="flex items-center min-w-0">
              <MapPinIcon className="h-4 w-4 mr-1 flex-shrink-0" />
              <span className="truncate">
                {gig.venue.name}
                {gig.venue.city && `, ${gig.venue.city}`}
              </span>
            </div>
          </div>

          {/* Tags */}
          {((gig.tags && gig.tags.length > 0) || ((gig as any).genre && (gig as any).genre.length > 0)) && (
            <div className="flex flex-wrap gap-1 mb-2">
              {(gig.tags || (gig as any).genre || []).slice(0, 4).map((tag: string, index: number) => {
                const backgroundColor = getTagColor(index);
                const textColor = getTextColor(backgroundColor);
                return (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                    style={{ backgroundColor, color: textColor }}
                  >
                    {tag}
                  </span>
                );
              })}
              {(gig.tags || (gig as any).genre || []).length > 4 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                  +{(gig.tags || (gig as any).genre || []).length - 4} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right side: Action buttons */}
        <div className="ml-4 flex items-center gap-2 flex-shrink-0">
          {gig.eventUrl && (
            <a
              href={gig.eventUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-primary-600 hover:text-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-sm px-1"
              title="View original event page"
            >
              <LinkIcon className="h-4 w-4 inline mr-1" />
              <span className="hidden sm:inline">Source</span>
            </a>
          )}
          
          {gig.ticketsUrl && (
            <a
              href={gig.ticketsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
            >
              <TicketIcon className="h-4 w-4" />
              Tickets
            </a>
          )}
        </div>
      </div>
    </div>
  );
}