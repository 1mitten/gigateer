import React from 'react';

interface DateDividerProps {
  date: string;
  className?: string;
}

export function DateDivider({ date, className = "" }: DateDividerProps) {
  return (
    <div 
      className={`flex items-center gap-6 mb-8 mt-12 first:mt-6 ${className}`}
      data-testid="date-divider"
    >
      <h2 className="text-sm font-medium text-amber-600 dark:text-amber-500 whitespace-nowrap tracking-wide uppercase">
        {date}
      </h2>
      <div className="flex-1 h-px bg-amber-200 dark:bg-amber-900/30"></div>
    </div>
  );
}