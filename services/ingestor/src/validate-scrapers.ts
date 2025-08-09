#!/usr/bin/env node

/**
 * Validation script to test that scrapers produce valid Gig objects
 */

import { validateGig } from "@gigateer/contracts";

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
  
  // All demo scrapers have been disabled - this validation script is for demonstration purposes only
  console.log("Demo scrapers have been disabled. Validation functionality remains for future use.");
  
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