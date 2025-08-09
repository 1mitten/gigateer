// Debug script to test specific selectors
import { chromium } from 'playwright';

async function debugSelectors() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('Navigating to Exchange Bristol...');
    await page.goto('https://exchangebristol.com/whats-on/');
    
    console.log('Waiting for HeadFirst containers...');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);
    
    const containers = await page.$$('.hf__event-listing');
    console.log(`Found ${containers.length} containers`);
    
    if (containers.length > 0) {
      console.log('\n--- Detailed examination of first container ---');
      
      // Get the full HTML of the first container
      const fullHTML = await containers[0].evaluate(el => el.outerHTML);
      console.log('Full HTML:', fullHTML.substring(0, 1000));
      
      // Test various selector strategies
      const selectors = [
        'a', // Link elements
        '.hf__event-listing--content a', // Links in content
        'h1, h2, h3, h4, h5, h6', // Headings
        '.hf__event-listing--content', // Content wrapper
        '.hf__event-listing--content > *', // Direct children of content
        'img', // Images
        '[class*="title"]', // Any class with 'title'
        '[class*="date"]', // Any class with 'date'
        'time', // Time elements
        '.hf__event-listing--image-wrapper', // Image wrapper
      ];
      
      for (const selector of selectors) {
        try {
          const elements = await containers[0].$$(selector);
          console.log(`\n${selector}: Found ${elements.length} elements`);
          
          for (let i = 0; i < Math.min(2, elements.length); i++) {
            const info = await elements[i].evaluate(el => ({
              tagName: el.tagName,
              className: el.className,
              textContent: el.textContent?.trim()?.substring(0, 100),
              innerHTML: el.innerHTML?.substring(0, 150),
              href: el.href || null,
              src: el.src || null
            }));
            console.log(`  [${i}]:`, info);
          }
        } catch (e) {
          console.log(`${selector}: Error - ${e.message}`);
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

debugSelectors();