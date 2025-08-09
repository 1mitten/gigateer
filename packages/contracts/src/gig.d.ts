import { z } from "zod";
export declare const GigSchema: z.ZodObject<{
    id: z.ZodString;
    source: z.ZodString;
    sourceId: z.ZodOptional<z.ZodString>;
    title: z.ZodString;
    artists: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    genre: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    dateStart: z.ZodString;
    dateEnd: z.ZodOptional<z.ZodString>;
    timezone: z.ZodOptional<z.ZodString>;
    venue: z.ZodObject<{
        name: z.ZodString;
        address: z.ZodOptional<z.ZodString>;
        city: z.ZodOptional<z.ZodString>;
        country: z.ZodOptional<z.ZodString>;
        lat: z.ZodOptional<z.ZodNumber>;
        lng: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        address?: string | undefined;
        city?: string | undefined;
        country?: string | undefined;
        lat?: number | undefined;
        lng?: number | undefined;
    }, {
        name: string;
        address?: string | undefined;
        city?: string | undefined;
        country?: string | undefined;
        lat?: number | undefined;
        lng?: number | undefined;
    }>;
    price: z.ZodOptional<z.ZodObject<{
        min: z.ZodNullable<z.ZodNumber>;
        max: z.ZodNullable<z.ZodNumber>;
        currency: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        min: number | null;
        max: number | null;
        currency: string | null;
    }, {
        min: number | null;
        max: number | null;
        currency: string | null;
    }>>;
    ageRestriction: z.ZodOptional<z.ZodString>;
    status: z.ZodDefault<z.ZodEnum<["scheduled", "cancelled", "postponed"]>>;
    ticketsUrl: z.ZodOptional<z.ZodString>;
    eventUrl: z.ZodOptional<z.ZodString>;
    images: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    updatedAt: z.ZodString;
    hash: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    source: string;
    title: string;
    status: "scheduled" | "cancelled" | "postponed";
    artists: string[];
    genre: string[];
    dateStart: string;
    venue: {
        name: string;
        address?: string | undefined;
        city?: string | undefined;
        country?: string | undefined;
        lat?: number | undefined;
        lng?: number | undefined;
    };
    images: string[];
    updatedAt: string;
    hash: string;
    sourceId?: string | undefined;
    dateEnd?: string | undefined;
    timezone?: string | undefined;
    price?: {
        min: number | null;
        max: number | null;
        currency: string | null;
    } | undefined;
    ageRestriction?: string | undefined;
    ticketsUrl?: string | undefined;
    eventUrl?: string | undefined;
}, {
    id: string;
    source: string;
    title: string;
    dateStart: string;
    venue: {
        name: string;
        address?: string | undefined;
        city?: string | undefined;
        country?: string | undefined;
        lat?: number | undefined;
        lng?: number | undefined;
    };
    updatedAt: string;
    hash: string;
    sourceId?: string | undefined;
    status?: "scheduled" | "cancelled" | "postponed" | undefined;
    artists?: string[] | undefined;
    genre?: string[] | undefined;
    dateEnd?: string | undefined;
    timezone?: string | undefined;
    price?: {
        min: number | null;
        max: number | null;
        currency: string | null;
    } | undefined;
    ageRestriction?: string | undefined;
    ticketsUrl?: string | undefined;
    eventUrl?: string | undefined;
    images?: string[] | undefined;
}>;
export type Gig = z.infer<typeof GigSchema>;
//# sourceMappingURL=gig.d.ts.map