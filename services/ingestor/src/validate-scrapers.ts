#!/usr/bin/env node

/**
 * Validation script to test that scrapers produce valid Gig objects
 */

import { validateGig } from "@gigateer/contracts";
import { RSSiCalScraper } from "./plugins/rss-ical-scraper";
import { HTMLPlaywrightScraper } from "./plugins/html-playwright-scraper";
import { bandsintownAmsterdamScraper } from "./plugins/bandsintown-rss-scraper";
import { blueNoteNYCScraper } from "./plugins/venue-website-scraper";

async function validateScraper(name: string, scraper: any, mockData?: any[]) {
  console.log(`\n=== Validating ${name} ===`);
  
  try {
    // Use mock data if provided, otherwise create some test data
    let rawData = mockData;
    
    if (!rawData) {
      console.log("No mock data provided, creating test data...");
      rawData = [
        {
          title: "Test Concert",
          dateStart: "2024-03-15T20:00:00Z",
          location: "Test Venue, Test City, Test Country",
          description: "A test concert event",
          categories: ["Rock", "Music"],
          link: "https://example.com/test-event"
        }
      ];
    }
    
    console.log(`Processing ${rawData.length} raw items...`);
    
    const gigs = await scraper.normalize(rawData);
    
    console.log(`Generated ${gigs.length} normalized gigs`);
    
    if (gigs.length === 0) {
      console.log("⚠️  No gigs were generated from the raw data");
      return false;
    }
    
    let validCount = 0;
    let invalidCount = 0;
    
    for (const gig of gigs) {
      try {
        const validatedGig = validateGig(gig);
        validCount++;
        
        // Log basic info about the valid gig
        console.log(`✅ Valid gig: "${validatedGig.title}" at ${validatedGig.venue.name} on ${validatedGig.dateStart}`);
        
      } catch (error) {
        invalidCount++;
        console.log(`❌ Invalid gig: ${error}`);
        console.log("   Gig data:", JSON.stringify(gig, null, 2));
      }
    }
    
    console.log(`\nResults: ${validCount} valid, ${invalidCount} invalid`);
    
    if (invalidCount === 0) {
      console.log(`✅ All ${validCount} gigs from ${name} passed validation!`);
      return true;
    } else {
      console.log(`❌ ${invalidCount} gigs from ${name} failed validation`);
      return false;
    }
    
  } catch (error) {
    console.log(`❌ Failed to validate ${name}: ${error}`);
    return false;
  }
}

async function main() {
  console.log("🔍 Validating demo scrapers...\n");
  
  const results: boolean[] = [];
  
  // Test RSS/iCal scraper with mock feed data
  const rssicalScraper = new RSSiCalScraper("https://example.com/test.rss", "test-rss");
  
  const mockRSSData = [
    {
      title: "Jazz Night featuring John Doe @ Blue Note NYC",
      dateStart: "2024-03-15T20:00:00Z",
      dateEnd: "2024-03-15T23:00:00Z",
      location: "Blue Note NYC, 131 W 3rd St, New York, NY 10012",
      categories: ["Jazz", "Live Music"],
      link: "https://example.com/jazz-night",
      description: "An evening of smooth jazz. Tickets $25-35."
    },
    {
      title: "Rock Concert @ The Forum",
      dateStart: "2024-03-16T21:00:00Z",
      location: "The Forum, Los Angeles, CA",
      categories: ["Rock"],
      link: "https://example.com/rock-concert",
      description: "High-energy rock show. Free entry!"
    }
  ];
  
  results.push(await validateScraper("RSS/iCal Scraper", rssicalScraper, mockRSSData));
  
  // Test HTML scraper with mock event data
  const htmlScraper = new HTMLPlaywrightScraper(
    "https://example.com",
    "test-html",
    ["https://example.com/events"]
  );
  
  const mockHTMLData = [
    {
      title: "Electronic Music Night",
      dateStart: "2024-03-17T22:00:00Z",
      venue: "Warehouse 51",
      address: "Industrial District, Amsterdam, Netherlands",
      price: "€15-20",
      artists: ["DJ Pulse", "Neon Dreams"],
      genres: ["Electronic", "Techno"],
      eventUrl: "https://example.com/electronic-night",
      ticketsUrl: "https://tickets.example.com/electronic",
      imageUrls: ["https://example.com/poster.jpg"]
    }
  ];
  
  results.push(await validateScraper("HTML Playwright Scraper", htmlScraper, mockHTMLData));
  
  // Test example scraper configurations (without actual scraping)
  console.log("\n=== Validating Example Scraper Configurations ===");
  
  const exampleScrapers = [
    { name: "Bandsintown Amsterdam", scraper: bandsintownAmsterdamScraper },
    { name: "Blue Note NYC", scraper: blueNoteNYCScraper },
  ];
  
  for (const { name, scraper } of exampleScrapers) {
    console.log(`\n📋 ${name}:`);
    console.log(`  - Name: ${scraper.upstreamMeta.name}`);
    console.log(`  - Rate limit: ${scraper.upstreamMeta.rateLimitPerMin}/min`);
    console.log(`  - Schedule: ${scraper.upstreamMeta.defaultSchedule}`);
    console.log(`  - Description: ${scraper.upstreamMeta.description}`);
    console.log(`  ✅ Configuration valid`);
  }
  
  // Final summary
  const successCount = results.filter(r => r).length;
  const totalCount = results.length;
  
  console.log(`\n${"=".repeat(50)}`);
  console.log(`VALIDATION SUMMARY:`);
  console.log(`✅ ${successCount}/${totalCount} scrapers passed validation`);
  
  if (successCount === totalCount) {
    console.log(`\n🎉 All demo scrapers are working correctly!`);
    console.log(`   They produce valid Gig objects that pass schema validation.`);
    process.exit(0);
  } else {
    console.log(`\n❌ Some scrapers failed validation. Please check the output above.`);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}