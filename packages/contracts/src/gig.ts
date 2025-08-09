import { z } from "zod";

export const GigSchema = z.object({
  id: z.string(), // stable ID in our catalog
  source: z.string(), // e.g. "songkick", "venue-xyz"
  sourceId: z.string().optional(), // upstream unique id if available
  title: z.string(),
  artists: z.array(z.string()).default([]),
  genre: z.array(z.string()).default([]),
  dateStart: z.string(), // ISO datetime
  dateEnd: z.string().optional(), // ISO if available
  timezone: z.string().optional(), // e.g. "Europe/Amsterdam"
  venue: z.object({
    name: z.string(),
    address: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
  }),
  price: z
    .object({
      min: z.number().nullable(),
      max: z.number().nullable(),
      currency: z.string().nullable(), // "EUR", "GBP"
    })
    .optional(),
  ageRestriction: z.string().optional(),
  status: z.enum(["scheduled", "cancelled", "postponed"]).default("scheduled"),
  ticketsUrl: z.string().url().optional(),
  eventUrl: z.string().url().optional(),
  images: z.array(z.string().url()).default([]),
  updatedAt: z.string(), // ISO when we last saw it
  hash: z.string(), // content hash for change detection
  // Change tracking fields
  isNew: z.boolean().optional(),
  isUpdated: z.boolean().optional(),
  firstSeenAt: z.string().optional(), // ISO timestamp
  lastSeenAt: z.string().optional(), // ISO timestamp
});

export type Gig = z.infer<typeof GigSchema>;