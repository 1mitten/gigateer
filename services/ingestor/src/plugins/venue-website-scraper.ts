import { HTMLPlaywrightScraper } from './html-playwright-scraper';

export interface ScraperMeta {
  name: string;
  rateLimitPerMin: number;
  defaultSchedule: string;
  baseUrl?: string;
}

export class BlueNoteNYCScraper extends HTMLPlaywrightScraper {
  public readonly upstreamMeta: ScraperMeta = {
    name: 'Blue Note NYC',
    rateLimitPerMin: 20,
    defaultSchedule: '0 */12 * * *', // Every 12 hours
    baseUrl: 'https://bluenotejazz.com'
  };

  constructor() {
    super(
      'https://bluenotejazz.com',
      'blue-note-nyc',
      ['https://bluenotejazz.com/events']
    );
  }
}

export const blueNoteNYCScraper = new BlueNoteNYCScraper();