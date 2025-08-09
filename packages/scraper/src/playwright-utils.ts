/**
 * Playwright utilities for robust web scraping with anti-bot detection
 */

import { Browser, BrowserContext, Page, chromium } from "playwright";
import { RateLimiter } from "./rate-limiter";
import { NetworkError, ScraperError } from "./errors";

/**
 * Configuration for Playwright browser setup
 */
export interface PlaywrightConfig {
  headless?: boolean;
  userAgent?: string;
  viewport?: { width: number; height: number };
  locale?: string;
  timezone?: string;
  extraHeaders?: Record<string, string>;
  proxy?: {
    server: string;
    username?: string;
    password?: string;
  };
}

/**
 * User agents to rotate through for stealth
 */
const DEFAULT_USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0",
];

/**
 * Managed Playwright browser instance with stealth features
 */
export class StealthBrowser {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private rateLimiter: RateLimiter;
  private currentUserAgent: string;
  private config: Required<PlaywrightConfig>;

  constructor(
    rateLimiter: RateLimiter,
    config: PlaywrightConfig = {}
  ) {
    this.rateLimiter = rateLimiter;
    this.currentUserAgent = this.getRandomUserAgent();
    
    this.config = {
      headless: true,
      userAgent: this.currentUserAgent,
      viewport: { width: 1920, height: 1080 },
      locale: "en-US",
      timezone: "America/New_York",
      extraHeaders: {},
      proxy: undefined as any,
      ...config,
    };
  }

  /**
   * Initialize the browser with stealth settings
   */
  async initialize(): Promise<void> {
    if (this.browser) return;

    this.browser = await chromium.launch({
      headless: this.config.headless,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox", 
        "--disable-dev-shm-usage",
        "--disable-blink-features=AutomationControlled",
        "--disable-web-security",
        "--disable-features=VizDisplayCompositor",
      ],
    });

    this.context = await this.browser.newContext({
      userAgent: this.currentUserAgent,
      viewport: this.config.viewport,
      locale: this.config.locale,
      timezoneId: this.config.timezone,
      extraHTTPHeaders: {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        ...this.config.extraHeaders,
      },
      proxy: this.config.proxy,
    });

    // Add stealth scripts
    await this.context.addInitScript(() => {
      // Remove webdriver property
      delete (window as any).webdriver;
      
      // Mock plugins
      Object.defineProperty(navigator, "plugins", {
        get: () => [1, 2, 3, 4, 5],
      });
      
      // Mock languages
      Object.defineProperty(navigator, "languages", {
        get: () => ["en-US", "en"],
      });
      
      // Mock permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters: any): Promise<any> => (
        parameters.name === "notifications" ?
          Promise.resolve({ state: Notification.permission } as any) :
          originalQuery(parameters)
      );
    });
  }

  /**
   * Create a new page with random delays and stealth setup
   */
  async createPage(): Promise<Page> {
    await this.initialize();
    if (!this.context) throw new Error("Browser context not initialized");

    const page = await this.context.newPage();

    // Set random viewport size (within reasonable bounds)
    await page.setViewportSize({
      width: 1366 + Math.floor(Math.random() * 554), // 1366-1920
      height: 768 + Math.floor(Math.random() * 312),  // 768-1080
    });

    // Add request interception for stealth
    await page.route("**/*", async (route) => {
      const headers = {
        ...route.request().headers(),
        "User-Agent": this.currentUserAgent,
      };
      
      await route.continue({ headers });
    });

    return page;
  }

  /**
   * Navigate to a URL with retry logic and stealth measures
   */
  async navigateWithRetry(
    page: Page,
    url: string,
    source: string,
    maxRetries = 3
  ): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.rateLimiter.waitForRequest();
        
        // Random delay before navigation (1-3 seconds)
        await this.randomDelay(1000, 3000);
        
        const response = await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        });

        if (!response || !response.ok()) {
          const status = response?.status() || 0;
          throw new NetworkError(source, url, new Error(`HTTP ${status}`));
        }

        // Random delay after successful load
        await this.randomDelay(500, 1500);
        
        this.rateLimiter.recordSuccess();
        return;
        
      } catch (error) {
        lastError = error as Error;
        this.rateLimiter.recordFailure();
        
        if (attempt === maxRetries) break;
        
        // Exponential backoff with jitter
        const backoffMs = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        await this.sleep(backoffMs);
        
        // Rotate user agent on retry
        this.currentUserAgent = this.getRandomUserAgent();
        await page.setExtraHTTPHeaders({
          "User-Agent": this.currentUserAgent,
        });
      }
    }

    throw new NetworkError(source, url, lastError || undefined);
  }

  /**
   * Wait for selector with random human-like delays
   */
  async waitForSelector(
    page: Page,
    selector: string,
    timeout = 10000
  ): Promise<void> {
    await page.waitForSelector(selector, { timeout });
    await this.randomDelay(100, 500); // Human-like delay after finding element
  }

  /**
   * Scroll page randomly to simulate human behavior
   */
  async simulateHumanScrolling(page: Page): Promise<void> {
    const scrollSteps = 2 + Math.floor(Math.random() * 3); // 2-4 steps
    
    for (let i = 0; i < scrollSteps; i++) {
      const scrollAmount = 200 + Math.random() * 300; // 200-500px
      await page.evaluate((amount) => {
        window.scrollBy(0, amount);
      }, scrollAmount);
      
      await this.randomDelay(500, 1500);
    }
    
    // Scroll back to top
    await page.evaluate(() => window.scrollTo(0, 0));
    await this.randomDelay(200, 500);
  }

  /**
   * Close browser and cleanup
   */
  async close(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  private getRandomUserAgent(): string {
    return DEFAULT_USER_AGENTS[Math.floor(Math.random() * DEFAULT_USER_AGENTS.length)];
  }

  private async randomDelay(minMs: number, maxMs: number): Promise<void> {
    const delay = minMs + Math.random() * (maxMs - minMs);
    await this.sleep(delay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Utility function to create a stealth browser with rate limiting
 */
export function createStealthBrowser(
  requestsPerMinute: number,
  config?: PlaywrightConfig
): StealthBrowser {
  const rateLimiter = new RateLimiter({ requestsPerMinute });
  return new StealthBrowser(rateLimiter, config);
}

/**
 * Check if robots.txt allows crawling of a path
 */
export async function checkRobotsTxt(
  baseUrl: string,
  path: string,
  userAgent = "*"
): Promise<boolean> {
  try {
    const robotsUrl = new URL("/robots.txt", baseUrl).toString();
    const response = await fetch(robotsUrl);
    
    if (!response.ok) {
      // If robots.txt doesn't exist, assume crawling is allowed
      return true;
    }
    
    const robotsText = await response.text();
    const lines = robotsText.split("\n").map(line => line.trim());
    
    let currentUserAgent: string | null = null;
    let isRelevantSection = false;
    
    for (const line of lines) {
      if (line.startsWith("User-agent:")) {
        const agent = line.substring(11).trim();
        currentUserAgent = agent;
        isRelevantSection = agent === "*" || agent.toLowerCase() === userAgent.toLowerCase();
        continue;
      }
      
      if (!isRelevantSection || !currentUserAgent) continue;
      
      if (line.startsWith("Disallow:")) {
        const disallowPath = line.substring(9).trim();
        if (disallowPath === "/" || path.startsWith(disallowPath)) {
          return false;
        }
      }
    }
    
    return true;
    
  } catch (error) {
    // If we can't check robots.txt, err on the side of allowing crawling
    console.warn(`Could not check robots.txt for ${baseUrl}:`, error);
    return true;
  }
}