// Debug second container to check for date information
import { chromium } from 'playwright';

async function debugContainer2() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://exchangebristol.com/whats-on/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);
    
    const containers = await page.$$('.hf__event-listing');
    console.log(`Found ${containers.length} containers`);
    
    // Examine containers 1, 2, 3 to see structural differences
    for (let i = 0; i < Math.min(5, containers.length); i++) {
      console.log(`\n--- Container ${i + 1} ---`);
      
      const fullHTML = await containers[i].evaluate(el => el.outerHTML);
      console.log('Full HTML:', fullHTML);
      
      // Look for any date-related selectors
      const dateSelectors = [
        '.hf__event-listing--date',
        '.hf__event-listing--datetime', 
        '.hf__event-listing--time',
        'time',
        '[class*="date"]',
        '[class*="time"]',
        '.hf__event-listing--content-top',
        '.hf__event-listing--content-bottom'
      ];
      
      for (const selector of dateSelectors) {
        try {
          const elements = await containers[i].$$(selector);
          if (elements.length > 0) {
            const text = await elements[0].textContent();
            console.log(`Date selector ${selector}: ${text?.trim()}`);
          }
        } catch (e) {
          // Ignore errors
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

debugContainer2();