// Test script to check what the frontend is displaying
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    if (msg.text().includes('[INFINITE SCROLL]') || msg.text().includes('[FETCH PAGE]') || msg.text().includes('[FRONTEND REQUEST]')) {
      console.log('BROWSER CONSOLE:', msg.text());
    }
  });
  
  await page.goto('http://localhost:3000');
  
  // Wait for initial load
  await page.waitForSelector('.p-6', { timeout: 5000 });
  
  console.log('\n=== Initial Load (should be date ASC) ===');
  const initialGig = await page.evaluate(() => {
    const firstGig = document.querySelector('.p-6');
    const title = firstGig?.querySelector('h3')?.innerText;
    const date = firstGig?.querySelector('.text-gray-600')?.innerText;
    return { title, date };
  });
  console.log('First gig:', initialGig);
  
  // Click on Date to toggle to DESC
  console.log('\n=== Clicking Date button to toggle to DESC ===');
  await page.click('button:has-text("Date")');
  
  // Wait a bit for the data to update
  await page.waitForTimeout(2000);
  
  const afterClickGig = await page.evaluate(() => {
    const firstGig = document.querySelector('.p-6');
    const title = firstGig?.querySelector('h3')?.innerText;
    const date = firstGig?.querySelector('.text-gray-600')?.innerText;
    return { title, date };
  });
  console.log('First gig after clicking Date:', afterClickGig);
  
  // Check what the API is returning
  console.log('\n=== Checking API directly ===');
  const apiResponse = await page.evaluate(async () => {
    const response = await fetch('/api/gigs?sortBy=date&sortOrder=desc&limit=3');
    const data = await response.json();
    return data.data[0];
  });
  console.log('API returns as first gig:', { title: apiResponse.title, date: apiResponse.dateStart });
  
  await browser.close();
})();