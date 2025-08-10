import React from 'react';

interface DateDividerProps {
  date: string;
  className?: string;
}

export function DateDivider({ date, className = "" }: DateDividerProps) {
  return (
    <div className={`flex items-center gap-6 mb-8 mt-12 first:mt-6 ${className}`}>
      <h2 className="text-sm font-medium text-gray-500 whitespace-nowrap tracking-wide uppercase">
        {date}
      </h2>
      <div className="flex-1 h-px bg-gray-200"></div>
    </div>
  );
}