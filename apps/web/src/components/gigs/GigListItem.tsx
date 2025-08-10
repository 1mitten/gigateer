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

interface GigListItemProps {
  gig: Gig;
  className?: string;
  priority?: boolean;
}

export function GigListItem({ gig, className = "", priority = false }: GigListItemProps) {
  // Debug log to confirm this component is being used
  console.log('GigListItem rendering for:', gig.title);
  
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
    <Link 
      href={`/gig/${gig.id}`}
      className={`block border-b border-gray-200 px-4 py-2 hover:bg-gray-50 transition-colors duration-200 ${className}`}
    >
      <div className="grid grid-cols-12 gap-4 items-center min-w-0">
        {/* Event title */}
        <div className="col-span-4 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 transition-colors truncate">
            {gig.title}
          </h3>
        </div>

        {/* Date */}
        <div className="col-span-2 flex items-center text-sm text-gray-600">
          <CalendarIcon className="h-3 w-3 mr-1 flex-shrink-0" />
          <span className="whitespace-nowrap">{formattedDate}</span>
        </div>

        {/* Time */}
        <div className="col-span-1 flex items-center text-sm text-gray-600">
          <ClockIcon className="h-3 w-3 mr-1 flex-shrink-0" />
          <span className="whitespace-nowrap">{formattedTime}</span>
        </div>

        {/* Venue */}
        <div className="col-span-3 flex items-center text-sm text-gray-600 min-w-0">
          <MapPinIcon className="h-3 w-3 mr-1 flex-shrink-0" />
          <span className="truncate">
            {gig.venue.name}
            {gig.venue.city && `, ${gig.venue.city}`}
          </span>
        </div>

        {/* Status badge */}
        <div className="col-span-1 flex justify-center">
          {getStatusBadge() || <span></span>}
        </div>

        {/* Action buttons */}
        <div className="col-span-1 flex items-center justify-end gap-1">
          {gig.eventUrl && (
            <a
              href={gig.eventUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-primary-600 hover:text-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-sm px-1 z-10 relative"
              title="View original event page"
              onClick={(e) => e.stopPropagation()}
            >
              <LinkIcon className="h-3 w-3" />
            </a>
          )}
          
          {gig.ticketsUrl && (
            <a
              href={gig.ticketsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-1 bg-primary-600 text-white text-xs font-medium rounded hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors whitespace-nowrap z-10 relative"
              onClick={(e) => e.stopPropagation()}
            >
              <TicketIcon className="h-3 w-3" />
              <span className="hidden sm:inline">Tickets</span>
            </a>
          )}
        </div>
      </div>
    </Link>
  );
}