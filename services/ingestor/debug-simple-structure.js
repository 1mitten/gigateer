import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('Navigating to The Lanes Bristol events page...');
  await page.goto('https://www.thelanesbristol.com/events');
  
  // Wait for page to load
  await page.waitForTimeout(5000);
  
  console.log('Looking for event structure patterns...');
  
  // Get the first few headfirst links and examine their surrounding HTML
  const eventData = await page.evaluate(() => {
    const links = document.querySelectorAll('a[href*="headfirstbristol"]');
    const events = [];
    
    for (let i = 0; i < Math.min(5, links.length); i++) {
      const link = links[i];
      const eventInfo = {
        index: i,
        title: link.textContent.trim(),
        url: link.href,
        parentInfo: []
      };
      
      // Go up 5 levels and capture info about each parent
      let current = link;
      for (let level = 0; level < 5; level++) {
        current = current.parentElement;
        if (!current) break;
        
        const parentInfo = {
          level: level + 1,
          tagName: current.tagName,
          className: current.className,
          id: current.id || '',
          hasImage: current.querySelector('img') !== null,
          hasTicketsOrInfo: current.textContent.includes('Tickets') || current.textContent.includes('Info'),
          textContent: current.textContent.substring(0, 200),
          childrenCount: current.children.length,
          htmlSnippet: current.innerHTML.substring(0, 300)
        };
        
        eventInfo.parentInfo.push(parentInfo);
      }
      
      events.push(eventInfo);
    }
    
    return events;
  });
  
  // Print the analysis
  eventData.forEach(event => {
    console.log(`\n=== Event ${event.index + 1}: ${event.title} ===`);
    console.log(`URL: ${event.url}`);
    
    event.parentInfo.forEach(parent => {
      console.log(`  Level ${parent.level}: ${parent.tagName} (class: "${parent.className}", id: "${parent.id}")`);
      console.log(`    Children: ${parent.childrenCount}, Has Image: ${parent.hasImage}, Has Tickets/Info: ${parent.hasTicketsOrInfo}`);
      console.log(`    Text: ${parent.textContent.replace(/\s+/g, ' ').trim()}...`);
      
      if (parent.hasImage && parent.hasTicketsOrInfo && parent.childrenCount > 2) {
        console.log('    *** This looks like the event container! ***');
      }
      console.log('');
    });
  });
  
  // Look for a common selector that would select individual event containers
  console.log('\n=== Testing potential selectors ===');
  
  const selectors = [
    // Based on the grid structure I saw in the screenshot
    '[data-fluid-engine] > div > div',
    '[data-fluid-engine] div[class*="cell"]',
    '.fe-block',
    '.sqs-block',
    '.content-wrapper',
    // Try to find containers that have both image and headfirst link
    'div:has(img):has(a[href*="headfirstbristol"])',
    '*:has(img):has(a[href*="headfirstbristol"])',
    // Look for specific patterns
    'div[class*="fe-"] > div',
    'div[data-block-type]',
  ];
  
  for (const selector of selectors) {
    try {
      const elements = await page.$$(selector);
      if (elements.length > 0) {
        // Check if any of these contain headfirst links
        const withEvents = [];
        for (const el of elements.slice(0, 20)) {
          const hasEventLink = await el.$('a[href*="headfirstbristol"]');
          if (hasEventLink) {
            const eventTitle = await hasEventLink.textContent();
            withEvents.push(eventTitle.trim());
          }
        }
        
        if (withEvents.length > 0) {
          console.log(`\nSelector "${selector}" found ${elements.length} elements, ${withEvents.length} with events:`);
          withEvents.slice(0, 5).forEach((title, i) => {
            console.log(`  ${i + 1}. ${title}`);
          });
        }
      }
    } catch (e) {
      // Skip selectors that cause errors
    }
  }
  
  await browser.close();
  console.log('\nDone!');
})();