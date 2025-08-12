import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('Navigating to The Lanes Bristol events page...');
  await page.goto('https://www.thelanesbristol.com/events');
  
  // Wait for page to load
  await page.waitForTimeout(5000);
  
  // Take a screenshot
  await page.screenshot({ path: 'lanes_bristol_current.png', fullPage: true });
  console.log('Screenshot saved to lanes_bristol_current.png');
  
  // Check various selectors
  const selectors = [
    'div[class*="event"]',
    '.event-card',
    '.event-item',
    '.event',
    'article',
    '[data-event]',
    '.hf_event_listing',
    '#hf_event_listing'
  ];
  
  for (const selector of selectors) {
    try {
      const elements = await page.$$(selector);
      if (elements.length > 0) {
        console.log(`Found ${elements.length} elements with selector: ${selector}`);
        
        // Get text from first element
        try {
          const text = await elements[0].textContent();
          console.log(`  First element text: ${text ? text.substring(0, 150) : 'No text'}...`);
        } catch (e) {
          console.log(`  Could not get text from first element`);
        }
      }
    } catch (e) {
      // Selector not supported, continue
    }
  }
  
  // Look for headfirst links specifically
  const headfirstLinks = await page.$$('a[href*="headfirstbristol"]');
  console.log(`Found ${headfirstLinks.length} headfirst links`);
  
  if (headfirstLinks.length > 0) {
    for (let i = 0; i < Math.min(5, headfirstLinks.length); i++) {
      const href = await headfirstLinks[i].getAttribute('href');
      const text = await headfirstLinks[i].textContent();
      console.log(`  Link ${i+1}: ${text} -> ${href}`);
    }
  }
  
  // Check the page HTML structure around events
  console.log('\nChecking HTML structure...');
  
  // Look for elements that contain event information
  const eventContainers = await page.$$('div:has(a[href*="headfirstbristol"])');
  console.log(`Found ${eventContainers.length} div containers with headfirst links`);
  
  if (eventContainers.length > 0) {
    for (let i = 0; i < Math.min(3, eventContainers.length); i++) {
      const outerHTML = await eventContainers[i].innerHTML();
      console.log(`\nContainer ${i+1} HTML (first 300 chars):`);
      console.log(outerHTML.substring(0, 300) + '...');
    }
  }
  
  await browser.close();
  console.log('\nDone!');
})();