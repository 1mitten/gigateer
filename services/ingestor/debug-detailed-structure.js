import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('Navigating to The Lanes Bristol events page...');
  await page.goto('https://www.thelanesbristol.com/events');
  
  // Wait for page to load
  await page.waitForTimeout(5000);
  
  // Find the first few event containers by looking at the structure around headfirst links
  console.log('Analyzing event container structure...');
  
  // Get all headfirst links and their parent containers
  const headfirstLinks = await page.$$('a[href*="headfirstbristol"]');
  console.log(`Found ${headfirstLinks.length} headfirst links`);
  
  // Analyze the first few events to understand the container structure
  for (let i = 0; i < Math.min(3, headfirstLinks.length); i++) {
    const link = headfirstLinks[i];
    const href = await link.getAttribute('href');
    const linkText = await link.textContent();
    
    console.log(`\n=== Event ${i+1}: ${linkText} ===`);
    console.log(`URL: ${href}`);
    
    // Find the event container by going up the DOM tree
    let container = link;
    let level = 0;
    
    // Try to find a meaningful container (one that likely contains the full event info)
    while (container && level < 5) {
      level++;
      try {
        container = await container.evaluateHandle(el => el.parentElement);
        if (!container) break;
      
      try {
        const containerHTML = await container.innerHTML();
        const hasImage = containerHTML.includes('<img') || containerHTML.includes('image');
        const hasDate = containerHTML.includes('August') || containerHTML.includes('2024') || containerHTML.includes('2025');
        const hasTickets = containerHTML.includes('Tickets') || containerHTML.includes('Info');
        
        console.log(`  Level ${level} - Has image: ${hasImage}, Has date: ${hasDate}, Has tickets: ${hasTickets}`);
        
        if (hasImage && hasDate && hasTickets) {
          console.log(`  -> This looks like the event container (level ${level})`);
          
          // Get the tag name and classes
          const tagName = await container.evaluate(el => el.tagName);
          const className = await container.getAttribute('class') || 'no-class';
          const id = await container.getAttribute('id') || 'no-id';
          
          console.log(`  Tag: ${tagName}, Class: "${className}", ID: "${id}"`);
          
          // Show a snippet of the HTML
          const htmlSnippet = containerHTML.substring(0, 500);
          console.log(`  HTML snippet: ${htmlSnippet}...`);
          break;
        }
      } catch (e) {
        console.log(`  Level ${level} - Error accessing container: ${e.message}`);
        break;
      }
    }
  }
  
  // Try to find a common parent that contains multiple events
  console.log('\n=== Looking for parent container with multiple events ===');
  
  // Look for elements that contain multiple headfirst links
  const possibleParents = await page.$$('[data-fluid-engine], .content, main, section, div');
  
  for (const parent of possibleParents.slice(0, 10)) {
    try {
      const childLinks = await parent.$$('a[href*="headfirstbristol"]');
      if (childLinks.length >= 2) {
        const tagName = await parent.evaluate(el => el.tagName);
        const className = await parent.getAttribute('class') || 'no-class';
        const id = await parent.getAttribute('id') || 'no-id';
        
        console.log(`Found parent with ${childLinks.length} events - Tag: ${tagName}, Class: "${className}", ID: "${id}"`);
        
        // If this is the main events container, show its structure
        if (childLinks.length > 10) {
          const innerHTML = await parent.innerHTML();
          const firstEventMatch = innerHTML.match(/<[^>]*>[^<]*Bark At The Moon[^<]*<\/[^>]*>/);
          if (firstEventMatch) {
            console.log('  Found main events container!');
            console.log('  Sample event HTML:', firstEventMatch[0]);
          }
        }
      }
    } catch (e) {
      // Skip problematic elements
    }
  }
  
  await browser.close();
  console.log('\nDone!');
})();