import { RSSiCalScraper } from './rss-ical-scraper';

export interface ScraperMeta {
  name: string;
  rateLimitPerMin: number;
  defaultSchedule: string;
  baseUrl?: string;
}

export class BandsintownAmsterdamScraper extends RSSiCalScraper {
  public readonly upstreamMeta: ScraperMeta = {
    name: 'Bandsintown Amsterdam',
    rateLimitPerMin: 30,
    defaultSchedule: '0 */6 * * *', // Every 6 hours
    baseUrl: 'https://bandsintown.com'
  };

  constructor() {
    super('https://bandsintown.com/amsterdam/rss', 'bandsintown-amsterdam');
  }
}

export const bandsintownAmsterdamScraper = new BandsintownAmsterdamScraper();