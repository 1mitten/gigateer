import React from 'react';
import { 
  MapPinIcon, 
  CalendarIcon, 
  ClockIcon,
} from '@heroicons/react/24/outline';

export function GigListHeader() {
  return (
    <div className="bg-gray-50 border-b border-gray-200 px-4 py-2">
      <div className="grid grid-cols-12 gap-4 items-center">
        {/* Event title */}
        <div className="col-span-4">
          <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
            Event
          </span>
        </div>

        {/* Date */}
        <div className="col-span-2 flex items-center">
          <CalendarIcon className="h-3 w-3 mr-1 text-gray-500" />
          <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
            Date
          </span>
        </div>

        {/* Time */}
        <div className="col-span-1 flex items-center">
          <ClockIcon className="h-3 w-3 mr-1 text-gray-500" />
          <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
            Time
          </span>
        </div>

        {/* Venue */}
        <div className="col-span-3 flex items-center">
          <MapPinIcon className="h-3 w-3 mr-1 text-gray-500" />
          <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
            Venue
          </span>
        </div>

        {/* Status */}
        <div className="col-span-1 flex justify-center">
          <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
            Status
          </span>
        </div>

        {/* Actions */}
        <div className="col-span-1 flex justify-end">
          <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
            Actions
          </span>
        </div>
      </div>
    </div>
  );
}