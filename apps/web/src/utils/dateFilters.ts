import { startOfDay } from 'date-fns/startOfDay';
import { endOfDay } from 'date-fns/endOfDay';
import { addDays } from 'date-fns/addDays';
import { startOfWeek } from 'date-fns/startOfWeek';
import { endOfWeek } from 'date-fns/endOfWeek';
import { startOfMonth } from 'date-fns/startOfMonth';
import { endOfMonth } from 'date-fns/endOfMonth';
import { addWeeks } from 'date-fns/addWeeks';

export type DateFilterOption = 'today' | 'tomorrow' | 'this-week' | 'this-month' | 'all';

export interface DateRange {
  from: string;
  to: string;
}

export interface DateFilterConfig {
  value: DateFilterOption;
  label: string;
  getDateRange: () => DateRange;
}

/**
 * Get date range for a given filter option
 * Returns ISO date strings (YYYY-MM-DD format)
 */
export function getDateRangeForFilter(option: DateFilterOption): DateRange {
  const now = new Date();
  
  switch (option) {
    case 'today':
      const todayStr = now.toISOString().split('T')[0];
      return {
        from: todayStr,
        to: todayStr
      };
      
    case 'tomorrow':
      const tomorrow = addDays(now, 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      return {
        from: tomorrowStr,
        to: tomorrowStr
      };
      
    case 'this-week':
      // Calculate "This Week" as from today through the next Sunday
      const todayForWeek = now.toISOString().split('T')[0];
      let thisWeekEnd;
      if (now.getDay() === 0) {
        // If today is Sunday, go to next Sunday (6 days ahead)
        thisWeekEnd = addDays(now, 6);
      } else {
        // Otherwise, go to the next Sunday
        thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
      }
      return {
        from: todayForWeek, // Start from today
        to: thisWeekEnd.toISOString().split('T')[0] // End of week (next Sunday)
      };
      
    case 'this-month':
      const thisMonthStart = startOfMonth(now);
      const thisMonthEnd = endOfMonth(now);
      return {
        from: thisMonthStart.toISOString().split('T')[0],
        to: thisMonthEnd.toISOString().split('T')[0]
      };
      
    case 'all':
    default:
      return {
        from: '',
        to: ''
      };
  }
}

/**
 * Configuration for all date filter options
 */
export const DATE_FILTER_OPTIONS: DateFilterConfig[] = [
  {
    value: 'all',
    label: 'All Dates',
    getDateRange: () => getDateRangeForFilter('all')
  },
  {
    value: 'today',
    label: 'Today',
    getDateRange: () => getDateRangeForFilter('today')
  },
  {
    value: 'tomorrow',
    label: 'Tomorrow',
    getDateRange: () => getDateRangeForFilter('tomorrow')
  },
  {
    value: 'this-week',
    label: 'This Week',
    getDateRange: () => getDateRangeForFilter('this-week')
  },
  {
    value: 'this-month',
    label: 'This Month',
    getDateRange: () => getDateRangeForFilter('this-month')
  }
];

/**
 * Convert date range to URL-friendly format
 */
export function formatDateRangeForUrl(range: DateRange): { dateFrom: string; dateTo: string } {
  return {
    dateFrom: range.from || '',
    dateTo: range.to || ''
  };
}

/**
 * Get the filter option that matches the given date range
 */
export function getDateFilterFromRange(dateFrom: string, dateTo: string): DateFilterOption {
  if (!dateFrom && !dateTo) {
    return 'all';
  }
  
  // Check each filter option to see if it matches the current date range
  for (const option of DATE_FILTER_OPTIONS) {
    const range = option.getDateRange();
    const formattedRange = formatDateRangeForUrl(range);
    
    if (formattedRange.dateFrom === dateFrom && formattedRange.dateTo === dateTo) {
      return option.value;
    }
  }
  
  // If no exact match, default to 'all'
  return 'all';
}