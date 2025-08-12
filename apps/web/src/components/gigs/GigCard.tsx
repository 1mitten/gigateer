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
import { format } from 'date-fns/format';

interface GigCardProps {
  gig: Gig;
  className?: string;
  priority?: boolean;
}

export function GigCard({ gig, className = "", priority = false }: GigCardProps) {
  
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

  // Helper function to safely parse and validate dates
  const parseGigDate = (dateString: string): Date | null => {
    try {
      const date = new Date(dateString);
      // Check if the date is valid
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
  const isUpcoming = isValidDate ? gigDate >= new Date() : true; // Default to upcoming if no valid date
  
  // Format date and time with fallbacks for invalid dates
  const formattedDate = isValidDate ? format(gigDate, 'EEE, MMM d, yyyy') : 'Date TBA';
  const formattedTime = isValidDate ? format(gigDate, 'h:mm a') : (
    // Try to extract time from the original string if it looks like a time range
    gig.dateStart.includes(':') ? gig.dateStart.trim() : 'Time TBA'
  );


  const getStatusBadge = () => {
    if (gig.status === 'cancelled') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Cancelled
        </span>
      );
    }
    
    if (gig.status === 'postponed') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          Postponed
        </span>
      );
    }
    
    if (!isUpcoming) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          Past Event
        </span>
      );
    }

    return null;
  };

  return (
    <article 
      className={`card hover:shadow-md transition-shadow duration-200 overflow-hidden ${className} h-full`}
      data-testid="gig-card"
    >
      <div className="p-6 h-full flex flex-col">
        {/* Content area that can grow */}
        <div className="flex-1">
          {/* Header with title and status */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <Link 
                href={`/gig/${gig.id}`}
                className="group"
              >
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-2">
                  {gig.title}
                </h3>
              </Link>
            </div>
            
            <div className="ml-4 flex-shrink-0">
              {getStatusBadge()}
            </div>
          </div>

          {/* Date and time */}
          <div className="flex items-center text-sm text-gray-600 mb-2">
            <CalendarIcon className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>{formattedDate}</span>
            <ClockIcon className="h-4 w-4 ml-4 mr-2 flex-shrink-0" />
            <span>{formattedTime}</span>
          </div>

          {/* Venue */}
          <div className="flex items-center text-sm text-gray-600 mb-2">
            <MapPinIcon className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="truncate">
              {gig.venue.name}
              {gig.venue.city && `, ${gig.venue.city}`}
            </span>
          </div>

          {/* Tags */}
          {((gig.tags && gig.tags.length > 0) || ((gig as any).genre && (gig as any).genre.length > 0)) && (
            <div className="flex flex-wrap gap-1 mb-4">
              {(gig.tags || (gig as any).genre || []).slice(0, 3).map((tag: string, index: number) => {
                const backgroundColor = getTagColor(index);
                const textColor = getTextColor(backgroundColor);
                return (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium"
                    style={{ backgroundColor, color: textColor }}
                  >
                    {tag}
                  </span>
                );
              })}
              {(gig.tags || (gig as any).genre || []).length > 3 && (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                  +{(gig.tags || (gig as any).genre || []).length - 3} more
                </span>
              )}
            </div>
          )}

          {/* Age restriction */}
          {gig.ageRestriction && (
            <div className="flex justify-end text-sm mb-4">
              <span className="text-gray-500 text-xs">
                {gig.ageRestriction}
              </span>
            </div>
          )}
        </div>

        {/* Action buttons - always at bottom */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 mt-auto">
          {gig.eventUrl && (
            <a
              href={gig.eventUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-primary-600 hover:text-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-sm px-1"
              title="View original event page"
            >
              <LinkIcon className="h-3 w-3 inline mr-1" />
              Source
            </a>
          )}
          
          <div className="flex items-center gap-2">
            {gig.ticketsUrl && (
              <a
                href={gig.ticketsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-600 text-white text-xs font-medium rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
              >
                <TicketIcon className="h-3 w-3" />
                Tickets
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

// Compact version for list views
export function GigCardCompact({ gig, className = "" }: GigCardProps) {
  const gigDate = new Date(gig.dateStart);
  const formattedDate = format(gigDate, 'MMM d');
  const formattedTime = format(gigDate, 'h:mm a');

  return (
    <article className={`card p-4 hover:shadow-md transition-shadow duration-200 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 flex-1 min-w-0">
          {/* Date block */}
          <div className="flex-shrink-0 text-center">
            <div className="text-sm font-semibold text-primary-600">
              {formattedDate}
            </div>
            <div className="text-xs text-gray-500">
              {formattedTime}
            </div>
          </div>
          
          {/* Event details */}
          <div className="flex-1 min-w-0">
            <Link href={`/gig/${gig.id}`} className="group">
              <h3 className="text-sm font-medium text-gray-900 group-hover:text-primary-600 transition-colors truncate">
                {gig.title}
              </h3>
            </Link>
            <p className="text-xs text-gray-600 truncate">
              {gig.venue.name}{gig.venue.city && `, ${gig.venue.city}`}
            </p>
            {gig.artists.length > 0 && (
              <p className="text-xs text-gray-500 truncate">
                {gig.artists.slice(0, 2).join(', ')}
              </p>
            )}
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {gig.ticketsUrl && (
            <a
              href={gig.ticketsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary text-xs px-2 py-1"
            >
              Tickets
            </a>
          )}
        </div>
      </div>
    </article>
  );
}