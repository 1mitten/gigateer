// Debug script to examine HeadFirst structure
const { chromium } = require('playwright');

async function debugHeadFirst() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('Navigating to Exchange Bristol...');
    await page.goto('https://exchangebristol.com/whats-on/');
    
    console.log('Waiting for HeadFirst containers...');
    await page.waitForSelector('.hf__event-listing', { timeout: 30000 });
    
    // Get all HeadFirst containers
    const containers = await page.$$('.hf__event-listing');
    console.log(`Found ${containers.length} HeadFirst containers`);
    
    // Examine first few containers
    for (let i = 0; i < Math.min(3, containers.length); i++) {
      console.log(`\n--- Container ${i + 1} ---`);
      
      // Get the outer HTML to see structure
      const outerHTML = await containers[i].evaluate(el => el.outerHTML.substring(0, 500));
      console.log('HTML:', outerHTML);
      
      // Get text content
      const textContent = await containers[i].evaluate(el => el.textContent?.trim()?.substring(0, 200));
      console.log('Text:', textContent);
      
      // Try to find common selectors
      const title = await containers[i].$eval('h1, h2, h3, h4, .title, .event-title', el => el.textContent?.trim()).catch(() => null);
      const date = await containers[i].$eval('.date, .datetime, time', el => el.textContent?.trim()).catch(() => null);
      const venue = await containers[i].$eval('.venue, .location', el => el.textContent?.trim()).catch(() => null);
      
      console.log('Extracted - Title:', title, 'Date:', date, 'Venue:', venue);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

debugHeadFirst();