import { z } from 'zod';

// Base types for different actions the scraper can perform
export const NavigateConfigSchema = z.object({
  type: z.literal('navigate'),
  url: z.string().url(),
  waitForLoad: z.boolean().default(true)
});

export const WaitConfigSchema = z.object({
  type: z.literal('wait'),
  selector: z.string().optional(),
  timeout: z.number().default(5000),
  condition: z.enum(['visible', 'hidden', 'networkidle']).default('visible')
});

export const ClickConfigSchema = z.object({
  type: z.literal('click'),
  selector: z.string(),
  waitAfter: z.number().optional(),
  optional: z.boolean().default(false)
});

export const ScrollConfigSchema = z.object({
  type: z.literal('scroll'),
  direction: z.enum(['down', 'up', 'bottom']).default('down'),
  amount: z.number().optional(),
  waitAfter: z.number().optional()
});

export const ExtractConfigSchema = z.object({
  type: z.literal('extract'),
  method: z.string().optional(), // Special extraction method (e.g., 'exchange-bristol')
  containerSelector: z.string(),
  fields: z.record(z.object({
    selector: z.string(),
    attribute: z.string().optional(), // 'text', 'href', 'src', or custom attribute
    multiple: z.boolean().default(false),
    required: z.boolean().default(true),
    transform: z.enum(['trim', 'lowercase', 'uppercase', 'date', 'slug', 'url', 'time-range-start', 'time-range-end', 'extract-text', 'regex', 'bristol-exchange-datetime', 'parse-date-group', 'exchange-venue-name', 'lanes-bristol-date', 'croft-bristol-date', 'thekla-bristol-date', 'fleece-bristol-datetime', 'strange-brew-datetime', 'rough-trade-datetime', 'rough-trade-city-mapper']).optional(),
    fallback: z.string().optional(),
    transformParams: z.record(z.any()).optional(), // For regex patterns, etc.
    followUp: z.object({
      urlField: z.string(), // Field that contains the URL to follow
      fields: z.record(z.object({
        selector: z.string(),
        attribute: z.string().optional(),
        transform: z.enum(['trim', 'lowercase', 'uppercase', 'date', 'slug', 'url', 'time-range-start', 'time-range-end', 'extract-text', 'regex', 'bristol-exchange-datetime', 'parse-date-group', 'exchange-venue-name', 'lanes-bristol-date', 'croft-bristol-date', 'thekla-bristol-date', 'fleece-bristol-datetime', 'strange-brew-datetime', 'rough-trade-datetime', 'rough-trade-city-mapper']).optional(),
        transformParams: z.record(z.any()).optional()
      }))
    }).optional() // Follow-up extraction from linked pages
  })),
  // Action-level follow-up extraction (applies to all extracted items)
  followUp: z.object({
    urlField: z.string(), // Field that contains the URL to follow
    fields: z.record(z.object({
      selector: z.string(),
      attribute: z.string().optional(),
      transform: z.enum(['trim', 'lowercase', 'uppercase', 'date', 'slug', 'url', 'time-range-start', 'time-range-end', 'extract-text', 'regex', 'bristol-exchange-datetime', 'parse-date-group', 'exchange-venue-name', 'lanes-bristol-date', 'croft-bristol-date', 'thekla-bristol-date', 'fleece-bristol-datetime', 'strange-brew-datetime', 'rough-trade-datetime', 'rough-trade-city-mapper']).optional(),
      transformParams: z.record(z.any()).optional()
    }))
  }).optional()
});

export const ActionSchema = z.union([
  NavigateConfigSchema,
  WaitConfigSchema,
  ClickConfigSchema,
  ScrollConfigSchema,
  ExtractConfigSchema
]);

// Main scraper configuration schema
export const ScraperConfigSchema = z.object({
  // Site metadata
  site: z.object({
    name: z.string(),
    baseUrl: z.string().url(),
    source: z.string(), // identifier for our system
    description: z.string().optional(),
    maintainer: z.string().optional(),
    lastUpdated: z.string().optional()
  }),

  // Browser and navigation settings
  browser: z.object({
    userAgent: z.string().optional(),
    viewport: z.object({
      width: z.number().default(1280),
      height: z.number().default(720)
    }).optional(),
    headless: z.boolean().default(true),
    timeout: z.number().default(30000)
  }).optional(),

  // Rate limiting and politeness
  rateLimit: z.object({
    delayBetweenRequests: z.number().default(1000),
    maxConcurrent: z.number().default(1),
    respectRobotsTxt: z.boolean().default(true)
  }).optional(),

  // Scraping workflow - ordered list of actions
  workflow: z.array(ActionSchema),

  // Field mappings to our Gig schema
  mapping: z.object({
    id: z.object({
      strategy: z.enum(['generated', 'extracted']).default('generated'),
      fields: z.array(z.string()).optional() // fields to use for ID generation
    }),
    title: z.string(),
    artist: z.string().optional(),
    venue: z.object({
      name: z.string(),
      address: z.string().optional(),
      city: z.string().optional(),
      country: z.string().optional()
    }),
    date: z.object({
      start: z.union([
        z.string(),
        z.object({
          field: z.string(),
          transform: z.enum(['trim', 'lowercase', 'uppercase', 'date', 'slug', 'url', 'time-range-start', 'time-range-end', 'extract-text', 'regex', 'bristol-exchange-datetime', 'parse-date-group', 'exchange-venue-name', 'lanes-bristol-date', 'croft-bristol-date', 'thekla-bristol-date', 'fleece-bristol-datetime', 'strange-brew-datetime', 'rough-trade-datetime', 'rough-trade-city-mapper']).optional(),
          transformParams: z.record(z.any()).optional()
        })
      ]),
      end: z.union([
        z.string(),
        z.object({
          field: z.string(),
          transform: z.enum(['trim', 'lowercase', 'uppercase', 'date', 'slug', 'url', 'time-range-start', 'time-range-end', 'extract-text', 'regex', 'bristol-exchange-datetime', 'parse-date-group', 'exchange-venue-name', 'lanes-bristol-date', 'croft-bristol-date', 'thekla-bristol-date', 'fleece-bristol-datetime', 'strange-brew-datetime', 'rough-trade-datetime', 'rough-trade-city-mapper']).optional(),
          transformParams: z.record(z.any()).optional()
        })
      ]).optional(),
      timezone: z.string().optional()
    }),
    urls: z.object({
      event: z.string().optional(),
      tickets: z.string().optional(),
      info: z.string().optional()
    }).optional(),
    images: z.string().optional(),
    genres: z.string().optional(),
    ageRestriction: z.string().optional(),
    description: z.string().optional()
  }),

  // Validation rules
  validation: z.object({
    required: z.array(z.string()).default(['title', 'venue.name', 'date.start']),
    dateFormat: z.string().optional(),
    minEventsExpected: z.number().default(0),
    maxEventsExpected: z.number().optional()
  }).optional(),

  // Debug and monitoring
  debug: z.object({
    screenshots: z.boolean().default(false),
    saveHtml: z.boolean().default(false),
    logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info')
  }).optional()
});

export type ScraperConfig = z.infer<typeof ScraperConfigSchema>;
export type ActionConfig = z.infer<typeof ActionSchema>;
export type NavigateConfig = z.infer<typeof NavigateConfigSchema>;
export type WaitConfig = z.infer<typeof WaitConfigSchema>;
export type ClickConfig = z.infer<typeof ClickConfigSchema>;
export type ScrollConfig = z.infer<typeof ScrollConfigSchema>;
export type ExtractConfig = z.infer<typeof ExtractConfigSchema>;