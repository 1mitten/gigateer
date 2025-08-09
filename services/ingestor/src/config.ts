import { join } from "path";
import type { IngestorConfig } from "@gigateer/contracts";
import type { ScheduleConfig } from "./scheduler.js";

export interface EnvironmentConfig {
  NODE_ENV?: string;
  INGESTOR_MODE?: 'development' | 'production';
  INGESTOR_ENABLED_SOURCES?: string;
  INGESTOR_DISABLED_SOURCES?: string;
  INGESTOR_DEFAULT_SCHEDULE?: string;
  INGESTOR_STAGGER_MINUTES?: string;
  INGESTOR_PID_FILE?: string;
  INGESTOR_LOG_DIR?: string;
  INGESTOR_RAW_DATA_DIR?: string;
  INGESTOR_NORMALIZED_DATA_DIR?: string;
  INGESTOR_RATE_LIMIT_PER_MIN?: string;
  INGESTOR_DEFAULT_RATE_LIMIT_PER_MIN?: string;
  INGESTOR_TIMEOUT_MS?: string;
  INGESTOR_LOG_RETENTION_DAYS?: string;
  // MongoDB Configuration
  MONGODB_CONNECTION_STRING?: string;
  MONGODB_DATABASE_NAME?: string;
  MONGODB_MAX_POOL_SIZE?: string;
  MONGODB_MIN_POOL_SIZE?: string;
  MONGODB_SERVER_SELECTION_TIMEOUT?: string;
  MONGODB_CONNECT_TIMEOUT?: string;
  MONGODB_SOCKET_TIMEOUT?: string;
  MONGODB_MAX_IDLE_TIME?: string;
  // Database Integration
  INGESTOR_USE_DATABASE?: string;
  INGESTOR_USE_FILE_STORAGE?: string;
}

export class ConfigManager {
  /**
   * Loads configuration from environment variables with defaults
   */
  static loadFromEnvironment(): { ingestorConfig: IngestorConfig; scheduleConfig: ScheduleConfig } {
    const env = process.env as EnvironmentConfig;
    
    // Base paths
    const baseDir = process.cwd();
    const dataDir = join(baseDir, "../../data");
    const sourcesDir = join(dataDir, "sources");
    const logDir = join(dataDir, "run-logs");
    
    // Determine mode
    const mode: 'development' | 'production' = 
      env.INGESTOR_MODE || 
      (env.NODE_ENV === 'development' ? 'development' : 'production');
    
    // Development vs production schedule defaults
    const defaultSchedule = mode === 'development' 
      ? "*/10 * * * *"  // Every 10 minutes in dev
      : "0 */3 * * *";  // Every 3 hours in production
    
    const ingestorConfig: IngestorConfig = {
      mode: mode as "development" | "production",
      dataDir: dataDir,
      rawDataDir: env.INGESTOR_RAW_DATA_DIR || sourcesDir,
      normalizedDataDir: env.INGESTOR_NORMALIZED_DATA_DIR || sourcesDir,
      logDir: env.INGESTOR_LOG_DIR || logDir,
      logRetentionDays: parseInt(env.INGESTOR_LOG_RETENTION_DAYS || "30", 10),
      pidFile: env.INGESTOR_PID_FILE || join(logDir, "ingestor.pid"),
      defaultRateLimitPerMin: parseInt(env.INGESTOR_DEFAULT_RATE_LIMIT_PER_MIN || "60", 10),
      globalRateLimitPerMin: parseInt(env.INGESTOR_RATE_LIMIT_PER_MIN || "60", 10),
      timeoutMs: parseInt(env.INGESTOR_TIMEOUT_MS || "30000", 10),
      staggerMinutes: parseInt(env.INGESTOR_STAGGER_MINUTES || "5", 10),
      sources: {}, // Will be populated later
    };
    
    const scheduleConfig: ScheduleConfig = {
      enabled: true,
      defaultSchedule: env.INGESTOR_DEFAULT_SCHEDULE || defaultSchedule,
      staggerMinutes: parseInt(env.INGESTOR_STAGGER_MINUTES || "5", 10),
      mode: mode,
      enabledSources: env.INGESTOR_ENABLED_SOURCES 
        ? env.INGESTOR_ENABLED_SOURCES.split(',').map(s => s.trim()) 
        : undefined,
      disabledSources: env.INGESTOR_DISABLED_SOURCES 
        ? env.INGESTOR_DISABLED_SOURCES.split(',').map(s => s.trim()) 
        : undefined,
      pidFile: env.INGESTOR_PID_FILE || join(logDir, "ingestor.pid"),
    };
    
    return { ingestorConfig, scheduleConfig };
  }
  
  /**
   * Validates the configuration
   */
  static validateConfig(ingestorConfig: IngestorConfig, scheduleConfig: ScheduleConfig): string[] {
    const errors: string[] = [];
    
    // Validate ingestor config
    if (!ingestorConfig.rawDataDir) {
      errors.push("Raw data directory must be specified");
    }
    
    if (!ingestorConfig.normalizedDataDir) {
      errors.push("Normalized data directory must be specified");
    }
    
    if (!ingestorConfig.logDir) {
      errors.push("Log directory must be specified");
    }
    
    if ((ingestorConfig.globalRateLimitPerMin || 0) <= 0) {
      errors.push("Global rate limit must be positive");
    }
    
    if ((ingestorConfig.timeoutMs || 0) <= 0) {
      errors.push("Timeout must be positive");
    }
    
    // Validate schedule config
    if (!scheduleConfig.defaultSchedule) {
      errors.push("Default schedule must be specified");
    }
    
    if (scheduleConfig.staggerMinutes && scheduleConfig.staggerMinutes < 0) {
      errors.push("Stagger minutes must be non-negative");
    }
    
    // Validate cron schedule format (basic check)
    if (scheduleConfig.defaultSchedule) {
      const cronParts = scheduleConfig.defaultSchedule.split(' ');
      if (cronParts.length !== 5) {
        errors.push("Default schedule must be a valid 5-part cron expression");
      }
    }
    
    // Check for conflicts in enabled/disabled sources
    if (scheduleConfig.enabledSources && scheduleConfig.disabledSources) {
      const enabled = new Set(scheduleConfig.enabledSources);
      const disabled = new Set(scheduleConfig.disabledSources);
      const overlap = [...enabled].filter(s => disabled.has(s));
      
      if (overlap.length > 0) {
        errors.push(`Sources cannot be both enabled and disabled: ${overlap.join(', ')}`);
      }
    }
    
    return errors;
  }
  
  /**
   * Gets runtime configuration summary
   */
  static getConfigSummary(ingestorConfig: IngestorConfig, scheduleConfig: ScheduleConfig): Record<string, any> {
    return {
      mode: scheduleConfig.mode,
      schedule: scheduleConfig.defaultSchedule,
      staggerMinutes: scheduleConfig.staggerMinutes,
      rateLimitPerMin: ingestorConfig.globalRateLimitPerMin,
      timeoutMs: ingestorConfig.timeoutMs,
      enabledSources: scheduleConfig.enabledSources?.length 
        ? scheduleConfig.enabledSources 
        : 'all (default)',
      disabledSources: scheduleConfig.disabledSources?.length 
        ? scheduleConfig.disabledSources 
        : 'none',
      directories: {
        rawData: ingestorConfig.rawDataDir,
        normalizedData: ingestorConfig.normalizedDataDir,
        logs: ingestorConfig.logDir,
      },
      pidFile: scheduleConfig.pidFile,
    };
  }
  
  /**
   * Gets default development configuration
   */
  static getDevelopmentDefaults(): { ingestorConfig: IngestorConfig; scheduleConfig: ScheduleConfig } {
    const baseDir = process.cwd();
    const dataDir = join(baseDir, "../../data");
    const sourcesDir = join(dataDir, "sources");
    const logDir = join(dataDir, "run-logs");
    
    const ingestorConfig: IngestorConfig = {
      mode: "development",
      dataDir: dataDir,
      rawDataDir: sourcesDir,
      normalizedDataDir: sourcesDir,
      logDir: logDir,
      logRetentionDays: 7, // Shorter retention for dev
      pidFile: join(logDir, "ingestor-dev.pid"),
      defaultRateLimitPerMin: 120,
      globalRateLimitPerMin: 120, // Higher rate limit for dev
      timeoutMs: 60000, // Longer timeout for debugging
      staggerMinutes: 2, // Less stagger in dev
      sources: {},
    };
    
    const scheduleConfig: ScheduleConfig = {
      enabled: true,
      defaultSchedule: "*/10 * * * *", // Every 10 minutes
      staggerMinutes: 2, // Shorter stagger for dev
      mode: 'development',
      pidFile: join(logDir, "ingestor-dev.pid"),
    };
    
    return { ingestorConfig, scheduleConfig };
  }
  
  /**
   * Gets default production configuration
   */
  static getProductionDefaults(): { ingestorConfig: IngestorConfig; scheduleConfig: ScheduleConfig } {
    const baseDir = process.cwd();
    const dataDir = join(baseDir, "../../data");
    const sourcesDir = join(dataDir, "sources");
    const logDir = join(dataDir, "run-logs");
    
    const ingestorConfig: IngestorConfig = {
      mode: "production",
      dataDir: dataDir,
      rawDataDir: sourcesDir,
      normalizedDataDir: sourcesDir,
      logDir: logDir,
      logRetentionDays: 30,
      pidFile: join(logDir, "ingestor.pid"),
      defaultRateLimitPerMin: 60,
      globalRateLimitPerMin: 60, // Conservative rate limit
      timeoutMs: 30000, // Standard timeout
      staggerMinutes: 5,
      sources: {},
    };
    
    const scheduleConfig: ScheduleConfig = {
      enabled: true,
      defaultSchedule: "0 */3 * * *", // Every 3 hours
      staggerMinutes: 5, // Standard stagger
      mode: 'production',
      pidFile: join(logDir, "ingestor.pid"),
    };
    
    return { ingestorConfig, scheduleConfig };
  }
  
  /**
   * Creates example environment file content
   */
  static createExampleEnv(): string {
    return `# Ingestor Configuration
# Mode: development or production
INGESTOR_MODE=development

# Scheduling Configuration
INGESTOR_DEFAULT_SCHEDULE="*/10 * * * *"
INGESTOR_STAGGER_MINUTES=5

# Source Control (comma-separated lists)
# INGESTOR_ENABLED_SOURCES=bandsintown,eventbrite
# INGESTOR_DISABLED_SOURCES=venue1,venue2

# Rate Limiting and Timeouts
INGESTOR_RATE_LIMIT_PER_MIN=60
INGESTOR_TIMEOUT_MS=30000

# File Paths (optional - defaults to relative paths)
# INGESTOR_RAW_DATA_DIR=/path/to/raw/data
# INGESTOR_NORMALIZED_DATA_DIR=/path/to/normalized/data
# INGESTOR_LOG_DIR=/path/to/logs
# INGESTOR_PID_FILE=/path/to/ingestor.pid

# Log Retention
INGESTOR_LOG_RETENTION_DAYS=30

# MongoDB Configuration
MONGODB_CONNECTION_STRING=mongodb://localhost:27017
MONGODB_DATABASE_NAME=gigateer
MONGODB_MAX_POOL_SIZE=10
MONGODB_MIN_POOL_SIZE=2
MONGODB_SERVER_SELECTION_TIMEOUT=5000
MONGODB_CONNECT_TIMEOUT=10000
MONGODB_SOCKET_TIMEOUT=45000
MONGODB_MAX_IDLE_TIME=30000

# Database Integration Options
INGESTOR_USE_DATABASE=true
INGESTOR_USE_FILE_STORAGE=true
`;
  }
}