import type { Gig, ScraperPlugin } from "@gigateer/contracts";
import { createGigId, generateGigHash } from "@gigateer/contracts";
import { chromium } from 'playwright';
import { logger } from '../logger.js';

const scraperLogger = logger.child({ component: 'exchange-bristol-scraper' });

interface RawEventData {
  title: string;
  artist: string;
  venue: string;
  timeRange: string;
  eventUrl?: string;
  ticketsUrl?: string;
  image?: string;
  description?: string;
  tags?: string[];
  dateGroup: string; // The date group this event belongs to
}

/**
 * Parse date group and time range into proper ISO dates
 */
function parseDateAndTime(dateGroup: string, timeRange: string): { startDate: string; endDate: string } {
  const today = new Date();
  let eventDate: Date;

  if (dateGroup === 'Today') {
    eventDate = new Date(today);
  } else {
    // Parse formats like "Monday 11th August", "Friday 10 January"
    eventDate = parseFormattedDate(dateGroup, today.getFullYear());
  }

  // Parse time range like "13:00 - 14:45" or "19:00 - 22:00"
  const timeMatch = timeRange.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
  
  let startDate: Date, endDate: Date;
  
  if (timeMatch) {
    const [, startHour, startMin, endHour, endMin] = timeMatch;
    
    startDate = new Date(eventDate);
    startDate.setHours(parseInt(startHour), parseInt(startMin), 0, 0);
    
    endDate = new Date(eventDate);
    endDate.setHours(parseInt(endHour), parseInt(endMin), 0, 0);
  } else {
    // Fallback if time parsing fails
    startDate = new Date(eventDate);
    endDate = new Date(eventDate);
  }

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  };
}

/**
 * Parse formatted dates like "Monday 11th August" or "Friday 10 January"
 */
function parseFormattedDate(dateStr: string, year: number): Date {
  // Remove ordinal suffixes (st, nd, rd, th)
  const cleanDateStr = dateStr.replace(/(\d+)(st|nd|rd|th)/, '$1');
  
  // Parse the date string
  const parts = cleanDateStr.trim().split(' ');
  
  if (parts.length >= 3) {
    const day = parseInt(parts[1]); // e.g., "11"
    const month = parts[2]; // e.g., "August"
    
    // Convert month name to month number
    const monthIndex = getMonthIndex(month);
    
    if (monthIndex !== -1 && !isNaN(day)) {
      const date = new Date(year, monthIndex, day);
      
      // If the date is in the past, assume it's next year
      if (date < new Date()) {
        date.setFullYear(year + 1);
      }
      
      return date;
    }
  }
  
  // Fallback to today if parsing fails
  return new Date();
}

/**
 * Convert month name to month index (0-based)
 */
function getMonthIndex(monthName: string): number {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  return months.findIndex(month => 
    month.toLowerCase().startsWith(monthName.toLowerCase().substring(0, 3))
  );
}

/**
 * Exchange Bristol scraper that properly handles date groups
 * This scraper navigates the Exchange Bristol website and associates events
 * with their preceding date group headers
 */
const exchangeBristolScraper: ScraperPlugin = {
  upstreamMeta: {
    name: "Exchange Bristol",
    rateLimitPerMin: 10,
    defaultSchedule: "0 */6 * * *", // Every 6 hours
    description: "Scrapes events from Exchange Bristol with proper date extraction",
  },

  async fetchRaw(): Promise<RawEventData[]> {
    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      
      // Set user agent and viewport
      await page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });
      await page.setViewportSize({ width: 1280, height: 720 });

      scraperLogger.info('Navigating to Exchange Bristol events page');
      await page.goto('https://exchangebristol.com/whats-on/', {
        waitUntil: 'networkidle',
        timeout: 45000
      });

      // Wait for event listings to load
      await page.waitForSelector('.hf__event-listing', { timeout: 45000 });
      await page.waitForTimeout(3000); // Additional wait for dynamic content

      scraperLogger.info('Extracting events with date groups');
      
      // Extract events with their associated date groups
      const rawEvents = await page.evaluate(() => {
        const events: RawEventData[] = [];
        let currentDateGroup = '';

        // Get all elements (date groups and event listings) in order
        const allElements = document.querySelectorAll('.hf__listings-date.js_headfirst_embed_date, .hf__event-listing');

        for (const element of allElements) {
          if (element.classList.contains('hf__listings-date')) {
            // This is a date group header
            currentDateGroup = element.textContent?.trim() || '';
          } else if (element.classList.contains('hf__event-listing') && currentDateGroup) {
            // This is an event listing
            const titleEl = element.querySelector('.hf__event-listing--name');
            const timeEl = element.querySelector('.hf__event-listing--time');
            const venueEl = element.querySelector('.hf__event-listing--stage-inner');
            const eventUrlEl = element.querySelector('.hf__event-listing--name') as HTMLAnchorElement;
            const ticketsUrlEl = element.querySelector('.hf__ticket-button') as HTMLAnchorElement;
            const imageEl = element.querySelector('.hf__event-listing--image') as HTMLImageElement;
            const descriptionEl = element.querySelector('.hf__event-listing--description-short');
            const tagEls = element.querySelectorAll('.hf__event-listing-genre');

            const event: RawEventData = {
              title: titleEl?.textContent?.trim() || 'Event at Exchange Bristol',
              artist: titleEl?.textContent?.trim() || '',
              venue: venueEl?.textContent?.trim() || 'Exchange Bristol',
              timeRange: timeEl?.textContent?.trim() || 'TBA',
              eventUrl: eventUrlEl?.href,
              ticketsUrl: ticketsUrlEl?.href,
              image: imageEl?.src,
              description: descriptionEl?.textContent?.trim(),
              tags: Array.from(tagEls).map(el => el.textContent?.trim()).filter(Boolean) as string[],
              dateGroup: currentDateGroup
            };

            events.push(event);
          }
        }

        return events;
      });

      scraperLogger.info(`Extracted ${rawEvents.length} events with date groups`);
      return rawEvents;

    } finally {
      await browser.close();
    }
  },

  async normalize(rawData: unknown[]): Promise<Gig[]> {
    const events = rawData as RawEventData[];
    return events.map((event, index) => {
      // Parse the date group and time range to create proper dates
      const { startDate, endDate } = parseDateAndTime(event.dateGroup, event.timeRange);
      
      const gig: Partial<Gig> = {
        source: "exchange-bristol",
        sourceId: `exchange-bristol-${index}`,
        updatedAt: new Date().toISOString(),
        
        title: event.title,
        artists: [event.artist].filter(Boolean),
        
        venue: {
          name: event.venue,
          address: "",
          city: "Bristol",
          country: "UK"
        },
        
        dateStart: startDate,
        dateEnd: endDate,
        
        
        eventUrl: event.eventUrl,
        ticketsUrl: event.ticketsUrl,
        
        images: event.image ? [event.image] : [],
        tags: event.tags || [],
        
        status: 'scheduled' as const
      };
      
      // Generate ID and hash after creating the partial gig
      const id = createGigId(event.title, event.venue, startDate);
      const completeGig: Gig = {
        ...gig,
        id,
        hash: generateGigHash({ ...gig, id } as Gig)
      } as Gig;
      
      return completeGig;
    });
  }
};

export default exchangeBristolScraper;