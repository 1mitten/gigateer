import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('Navigating to The Lanes Bristol events page...');
  await page.goto('https://www.thelanesbristol.com/events');
  
  // Wait for page to load
  await page.waitForTimeout(5000);
  
  console.log('Analyzing field structure within individual events...');
  
  // Find the first few event containers
  const eventContainers = await page.$$('.js_headfirst_embed_listing');
  console.log(`Found ${eventContainers.length} event containers`);
  
  // Analyze the first 3 events to understand their field structure
  for (let i = 0; i < Math.min(3, eventContainers.length); i++) {
    const container = eventContainers[i];
    console.log(`\n=== Event Container ${i + 1} ===`);
    
    // Get the event title
    const titleElement = await container.$('a[href*="headfirstbristol"]');
    if (titleElement) {
      const title = await titleElement.textContent();
      console.log(`Title: ${title}`);
    }
    
    // Get the inner HTML to see the structure
    const innerHTML = await container.innerHTML();
    console.log(`HTML structure (first 600 chars):`);
    console.log(innerHTML.substring(0, 600) + '...\n');
    
    // Test various date/time selectors
    const dateSelectors = [
      '.hf__event-listing--date-time',
      '.hf__event-listing--content',
      'div:nth-child(1)',
      'div[class*="date"]',
      'div[class*="time"]',
      'div',
      '*'
    ];
    
    console.log('Testing date selectors:');
    for (const selector of dateSelectors) {
      try {
        const elements = await container.$$(selector);
        if (elements.length > 0) {
          for (let j = 0; j < Math.min(3, elements.length); j++) {
            const text = await elements[j].textContent();
            if (text && text.trim() && text.includes('August') || text.includes('September') || text.includes('October') || text.includes('Nov') || text.includes('Dec')) {
              console.log(`  ✅ "${selector}" -> "${text.trim()}"`);
            }
          }
        }
      } catch (e) {
        // Skip problematic selectors
      }
    }
    
    // Test button selectors for Info/Tickets
    const buttonSelectors = [
      '.hf__event-listing--button',
      'a[href*="Info"]',
      'a:contains("Info")',
      'a:contains("Tickets")',
      'a',
    ];
    
    console.log('Testing button selectors:');
    for (const selector of buttonSelectors) {
      try {
        const elements = await container.$$(selector);
        if (elements.length > 0) {
          for (let j = 0; j < elements.length; j++) {
            const text = await elements[j].textContent();
            const href = await elements[j].getAttribute('href');
            if (text && (text.includes('Info') || text.includes('Tickets'))) {
              console.log(`  ✅ "${selector}" -> "${text.trim()}" (${href})`);
            }
          }
        }
      } catch (e) {
        // Skip problematic selectors
      }
    }
    
    // Test image selectors
    const imageSelectors = [
      '.hf__event-listing--image img',
      'img',
    ];
    
    console.log('Testing image selectors:');
    for (const selector of imageSelectors) {
      try {
        const elements = await container.$$(selector);
        if (elements.length > 0) {
          for (let j = 0; j < Math.min(2, elements.length); j++) {
            const src = await elements[j].getAttribute('src');
            console.log(`  ✅ "${selector}" -> src="${src}"`);
          }
        }
      } catch (e) {
        // Skip problematic selectors
      }
    }
    
    if (i < 2) {
      console.log('\n' + '='.repeat(50));
    }
  }
  
  await browser.close();
  console.log('\nDone!');
})();