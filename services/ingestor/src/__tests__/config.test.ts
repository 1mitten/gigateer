import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Config } from '../config';

describe('Config', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('default values', () => {
    it('should provide sensible defaults', () => {
      // Clear relevant env vars
      delete process.env.DATA_DIR;
      delete process.env.SCHEDULE_INTERVAL_MINUTES;
      delete process.env.GLOBAL_RATE_LIMIT_PER_MINUTE;

      const config = new Config();

      expect(config.dataDir).toBe('./data');
      expect(config.scheduleIntervalMinutes).toBe(180); // 3 hours
      expect(config.globalRateLimitPerMinute).toBe(30);
      expect(config.isDevelopment).toBe(process.env.NODE_ENV !== 'production');
    });

    it('should use environment variables when provided', () => {
      process.env.DATA_DIR = '/custom/data';
      process.env.SCHEDULE_INTERVAL_MINUTES = '60';
      process.env.GLOBAL_RATE_LIMIT_PER_MINUTE = '100';
      process.env.NODE_ENV = 'production';

      const config = new Config();

      expect(config.dataDir).toBe('/custom/data');
      expect(config.scheduleIntervalMinutes).toBe(60);
      expect(config.globalRateLimitPerMinute).toBe(100);
      expect(config.isDevelopment).toBe(false);
    });
  });

  describe('logging configuration', () => {
    it('should configure development logging', () => {
      process.env.NODE_ENV = 'development';
      
      const config = new Config();
      const logConfig = config.getLoggerConfig();

      expect(logConfig.level).toBe('debug');
      expect(logConfig.transport?.target).toBe('pino-pretty');
    });

    it('should configure production logging', () => {
      process.env.NODE_ENV = 'production';
      
      const config = new Config();
      const logConfig = config.getLoggerConfig();

      expect(logConfig.level).toBe('info');
      expect(logConfig.transport).toBeUndefined();
    });
  });

  describe('validation', () => {
    it('should validate configuration values', () => {
      const config = new Config();
      
      expect(() => config.validate()).not.toThrow();
    });

    it('should handle invalid numeric environment variables gracefully', () => {
      process.env.SCHEDULE_INTERVAL_MINUTES = 'not-a-number';
      process.env.GLOBAL_RATE_LIMIT_PER_MINUTE = 'also-not-a-number';

      const config = new Config();

      // Should fall back to defaults
      expect(config.scheduleIntervalMinutes).toBe(180);
      expect(config.globalRateLimitPerMinute).toBe(30);
    });
  });
});