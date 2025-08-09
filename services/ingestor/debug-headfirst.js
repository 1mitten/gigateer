// Debug script to examine HeadFirst structure
import { chromium } from 'playwright';
import { promises as fs } from 'fs';

async function debugHeadFirst() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('Navigating to Exchange Bristol...');
    await page.goto('https://exchangebristol.com/whats-on/');
    
    console.log('Waiting for network to settle...');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000); // Extra wait for HeadFirst
    
    // Check for HeadFirst containers
    const containers = await page.$$('.hf__event-listing');
    console.log(`Found ${containers.length} HeadFirst containers`);
    
    if (containers.length === 0) {
      console.log('No HeadFirst containers found. Checking page content...');
      const pageContent = await page.content();
      
      // Check if HeadFirst script is present
      if (pageContent.includes('headfirst') || pageContent.includes('HeadFirst')) {
        console.log('HeadFirst references found in page');
      }
      
      // Look for any event-like containers
      const possibleContainers = await page.$$('article, .event, .listing, [class*="event"], [class*="gig"]');
      console.log(`Found ${possibleContainers.length} possible event containers`);
      
      if (possibleContainers.length > 0) {
        const firstContainer = await possibleContainers[0].evaluate(el => ({
          tagName: el.tagName,
          className: el.className,
          innerHTML: el.innerHTML.substring(0, 300)
        }));
        console.log('First possible container:', firstContainer);
      }
      
      // Save page HTML for inspection
      const html = await page.content();
      await fs.writeFile('debug-page.html', html);
      console.log('Saved page HTML to debug-page.html');
    }
    
    // Examine first few containers if found
    for (let i = 0; i < Math.min(3, containers.length); i++) {
      console.log(`\n--- Container ${i + 1} ---`);
      
      const containerInfo = await containers[i].evaluate(el => ({
        outerHTML: el.outerHTML.substring(0, 500),
        textContent: el.textContent?.trim()?.substring(0, 200),
        className: el.className,
        tagName: el.tagName
      }));
      
      console.log('Container info:', containerInfo);
      
      // Try to find common selectors within the container
      try {
        const title = await containers[i].$eval('h1, h2, h3, h4, .title, .event-title, [class*="title"]', el => el.textContent?.trim());
        console.log('Title found:', title);
      } catch (e) {
        console.log('No title found');
      }
      
      try {
        const date = await containers[i].$eval('.date, .datetime, time, [class*="date"]', el => el.textContent?.trim());
        console.log('Date found:', date);
      } catch (e) {
        console.log('No date found');
      }
      
      try {
        const link = await containers[i].$eval('a', el => el.href);
        console.log('Link found:', link);
      } catch (e) {
        console.log('No link found');
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

debugHeadFirst();