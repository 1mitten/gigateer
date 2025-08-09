/**
 * Playwright utilities for robust web scraping with anti-bot detection
 */
import { Page } from "playwright";
import { RateLimiter } from "./rate-limiter";
/**
 * Configuration for Playwright browser setup
 */
export interface PlaywrightConfig {
    headless?: boolean;
    userAgent?: string;
    viewport?: {
        width: number;
        height: number;
    };
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
 * Managed Playwright browser instance with stealth features
 */
export declare class StealthBrowser {
    private browser;
    private context;
    private rateLimiter;
    private currentUserAgent;
    private config;
    constructor(rateLimiter: RateLimiter, config?: PlaywrightConfig);
    /**
     * Initialize the browser with stealth settings
     */
    initialize(): Promise<void>;
    /**
     * Create a new page with random delays and stealth setup
     */
    createPage(): Promise<Page>;
    /**
     * Navigate to a URL with retry logic and stealth measures
     */
    navigateWithRetry(page: Page, url: string, source: string, maxRetries?: number): Promise<void>;
    /**
     * Wait for selector with random human-like delays
     */
    waitForSelector(page: Page, selector: string, timeout?: number): Promise<void>;
    /**
     * Scroll page randomly to simulate human behavior
     */
    simulateHumanScrolling(page: Page): Promise<void>;
    /**
     * Close browser and cleanup
     */
    close(): Promise<void>;
    private getRandomUserAgent;
    private randomDelay;
    private sleep;
}
/**
 * Utility function to create a stealth browser with rate limiting
 */
export declare function createStealthBrowser(requestsPerMinute: number, config?: PlaywrightConfig): StealthBrowser;
/**
 * Check if robots.txt allows crawling of a path
 */
export declare function checkRobotsTxt(baseUrl: string, path: string, userAgent?: string): Promise<boolean>;
//# sourceMappingURL=playwright-utils.d.ts.map