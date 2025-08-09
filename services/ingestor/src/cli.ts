#!/usr/bin/env node

import { Command } from "commander";
import { join } from "path";
import { writeFileSync } from "fs";
import type { IngestorConfig } from "@gigateer/contracts";
import { Ingestor } from "./ingestor.js";
import { Scheduler, type ScheduleConfig, readPidFile, isProcessRunning } from "./scheduler.js";
import { ConfigManager } from "./config.js";
import { logger } from "./logger.js";

const program = new Command();

// Load default configuration from environment
const { ingestorConfig: defaultConfig, scheduleConfig: defaultScheduleConfig } = ConfigManager.loadFromEnvironment();

program
  .name("ingestor")
  .description("Gig data ingestion service with plugin architecture")
  .version("1.0.0");

program
  .command("ingest:all")
  .description("Run ingestion for all sources")
  .option("-c, --config <path>", "Path to configuration file")
  .action(async (options) => {
    try {
      const config = await loadConfig(options.config);
      const ingestor = new Ingestor(config);
      
      await ingestor.initialize();
      const results = await ingestor.ingestAll();
      
      // Print summary
      const summary = {
        totalSources: results.length,
        successfulSources: results.filter(r => r.success).length,
        failedSources: results.filter(r => !r.success).length,
        totalGigs: results.reduce((sum, r) => sum + r.normalizedCount, 0),
        totalNew: results.reduce((sum, r) => sum + r.newCount, 0),
        totalUpdated: results.reduce((sum, r) => sum + r.updatedCount, 0),
        totalErrors: results.reduce((sum, r) => sum + (r.errorCount || 0), 0),
      };
      
      logger.info(summary, "Ingestion completed");
      
      if (summary.failedSources > 0) {
        logger.warn({ failedSources: summary.failedSources }, "Some sources failed");
        process.exit(1);
      }
      
      await ingestor.cleanup();
    } catch (error) {
      logger.error({ error: (error as Error).message }, "Failed to run ingest:all");
      process.exit(1);
    }
  });

program
  .command("ingest:source")
  .description("Run ingestion for a single source")
  .argument("<source>", "Source name to ingest")
  .option("-c, --config <path>", "Path to configuration file")
  .action(async (source: string, options) => {
    try {
      const config = await loadConfig(options.config);
      const ingestor = new Ingestor(config);
      
      await ingestor.initialize();
      const result = await ingestor.ingestSource(source);
      
      logger.info(
        {
          source: result.source,
          success: result.success,
          duration: result.duration,
          raw: result.rawCount,
          normalized: result.normalizedCount,
          new: result.newCount,
          updated: result.updatedCount,
          errors: result.errorCount,
        },
        "Source ingestion completed"
      );
      
      if (!result.success) {
        logger.error({ errors: result.errors }, "Ingestion failed");
        process.exit(1);
      }
      
      await ingestor.cleanup();
    } catch (error) {
      logger.error({ error: (error as Error).message, source }, "Failed to run ingest:source");
      process.exit(1);
    }
  });

program
  .command("validate")
  .description("Validate all normalized data against schema")
  .option("-c, --config <path>", "Path to configuration file")
  .action(async (options) => {
    try {
      const config = await loadConfig(options.config);
      const ingestor = new Ingestor(config);
      
      const results = await ingestor.validateAllNormalizedData();
      
      let totalValid = 0;
      let totalInvalid = 0;
      let hasErrors = false;
      
      for (const [source, result] of Object.entries(results)) {
        totalValid += result.valid;
        totalInvalid += result.invalid;
        
        if (result.invalid > 0) {
          hasErrors = true;
          logger.error(
            {
              source,
              valid: result.valid,
              invalid: result.invalid,
              errors: result.errors.slice(0, 5), // Show first 5 errors
            },
            "Validation errors found"
          );
        } else {
          logger.info(
            { source, valid: result.valid },
            "All data valid"
          );
        }
      }
      
      logger.info(
        {
          totalSources: Object.keys(results).length,
          totalValid,
          totalInvalid,
          success: !hasErrors,
        },
        "Validation completed"
      );
      
      if (hasErrors) {
        process.exit(1);
      }
      
    } catch (error) {
      logger.error({ error: (error as Error).message }, "Failed to run validate");
      process.exit(1);
    }
  });

program
  .command("stats")
  .description("Show statistics about all sources")
  .option("-c, --config <path>", "Path to configuration file")
  .action(async (options) => {
    try {
      const config = await loadConfig(options.config);
      const ingestor = new Ingestor(config);
      
      const stats = await ingestor.getSourceStats();
      
      logger.info(stats, "Source statistics");
      
      const totalGigs = Object.values(stats).reduce((sum, stat) => sum + stat.count, 0);
      logger.info({ totalSources: Object.keys(stats).length, totalGigs }, "Summary");
      
    } catch (error) {
      logger.error({ error: (error as Error).message }, "Failed to get stats");
      process.exit(1);
    }
  });

program
  .command("daemon")
  .description("Run the scheduler daemon to automatically ingest sources")
  .option("-c, --config <path>", "Path to configuration file")
  .option("--no-stagger", "Disable staggering of plugin runs")
  .option("--schedule <cron>", "Override default cron schedule")
  .option("--pid-file <path>", "Path to PID file", defaultScheduleConfig.pidFile)
  .option("--enabled-sources <sources>", "Comma-separated list of enabled sources")
  .option("--disabled-sources <sources>", "Comma-separated list of disabled sources")
  .option("--mode <mode>", "Runtime mode (development|production)", defaultScheduleConfig.mode)
  .action(async (options) => {
    try {
      const config = await loadConfig(options.config);
      
      // Check if daemon is already running
      const pidFile = options.pidFile || defaultScheduleConfig.pidFile;
      const existingPid = readPidFile(pidFile!);
      
      if (existingPid && isProcessRunning(existingPid)) {
        logger.error({ pid: existingPid }, "Scheduler daemon is already running");
        process.exit(1);
      }
      
      const scheduleConfig: ScheduleConfig = {
        ...defaultScheduleConfig,
        staggerMinutes: options.stagger === false ? 0 : defaultScheduleConfig.staggerMinutes,
        defaultSchedule: options.schedule || defaultScheduleConfig.defaultSchedule,
        pidFile: pidFile,
        mode: options.mode as 'development' | 'production' || defaultScheduleConfig.mode,
        enabledSources: options.enabledSources ? options.enabledSources.split(',').map((s: string) => s.trim()) : undefined,
        disabledSources: options.disabledSources ? options.disabledSources.split(',').map((s: string) => s.trim()) : undefined,
      };
      
      const scheduler = new Scheduler(config, scheduleConfig);
      
      // Handle graceful shutdown
      let isShuttingDown = false;
      const shutdown = async (signal: string) => {
        if (isShuttingDown) return;
        isShuttingDown = true;
        
        logger.info({ signal }, "Received shutdown signal, stopping scheduler...");
        
        try {
          await scheduler.stop();
          logger.info("Scheduler stopped gracefully");
          process.exit(0);
        } catch (error) {
          logger.error({ error: (error as Error).message }, "Error during shutdown");
          process.exit(1);
        }
      };
      
      // Handle multiple signals
      process.on("SIGINT", () => shutdown("SIGINT"));
      process.on("SIGTERM", () => shutdown("SIGTERM"));
      process.on("SIGQUIT", () => shutdown("SIGQUIT"));
      
      // Handle uncaught exceptions
      process.on("uncaughtException", (error) => {
        logger.fatal({ error: error.message, stack: error.stack }, "Uncaught exception, shutting down");
        shutdown("UNCAUGHT_EXCEPTION");
      });
      
      process.on("unhandledRejection", (reason, promise) => {
        logger.fatal({ reason, promise }, "Unhandled rejection, shutting down");
        shutdown("UNHANDLED_REJECTION");
      });
      
      await scheduler.start();
      
      // Keep the process running
      logger.info("Scheduler daemon is running. Press Ctrl+C to stop.");
      
      // Prevent process from exiting
      const keepAlive = setInterval(() => {
        // Log status periodically
        const status = scheduler.getStatus();
        logger.debug({ 
          runningTasks: status.runningJobs, 
          totalTasks: status.totalJobs, 
          uptime: Math.floor(status.uptime / 1000)
        }, "Scheduler status");
      }, 5 * 60 * 1000); // Every 5 minutes
      
      // Keep the interval from exiting the process
      keepAlive.unref();
      
    } catch (error) {
      logger.error({ error: (error as Error).message }, "Failed to start daemon");
      process.exit(1);
    }
  });

program
  .command("scheduler:status")
  .description("Show status of the scheduler daemon")
  .option("--pid-file <path>", "Path to PID file", defaultScheduleConfig.pidFile)
  .action(async (options) => {
    try {
      const pidFile = options.pidFile || defaultScheduleConfig.pidFile;
      const pid = readPidFile(pidFile!);
      
      if (!pid) {
        logger.info("No scheduler daemon running (no PID file found)");
        return;
      }
      
      if (!isProcessRunning(pid)) {
        logger.info({ pid }, "Scheduler daemon not running (stale PID file)");
        return;
      }
      
      logger.info({ pid, pidFile }, "Scheduler daemon is running");
      
      // TODO: Implement remote status checking via IPC or API
      // For now, we can only check if the process is running
      
    } catch (error) {
      logger.error({ error: (error as Error).message }, "Failed to check scheduler status");
      process.exit(1);
    }
  });

program
  .command("scheduler:stop")
  .description("Stop the scheduler daemon")
  .option("--pid-file <path>", "Path to PID file", defaultScheduleConfig.pidFile)
  .option("-f, --force", "Force kill the process")
  .action(async (options) => {
    try {
      const pidFile = options.pidFile || defaultScheduleConfig.pidFile;
      const pid = readPidFile(pidFile!);
      
      if (!pid) {
        logger.info("No scheduler daemon running (no PID file found)");
        return;
      }
      
      if (!isProcessRunning(pid)) {
        logger.info({ pid }, "Scheduler daemon not running (stale PID file)");
        return;
      }
      
      logger.info({ pid }, "Stopping scheduler daemon...");
      
      try {
        // Send SIGTERM for graceful shutdown
        process.kill(pid, options.force ? 'SIGKILL' : 'SIGTERM');
        
        // Wait for process to stop
        let attempts = 0;
        const maxAttempts = 30; // 30 seconds
        
        while (isProcessRunning(pid) && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          attempts++;
        }
        
        if (isProcessRunning(pid)) {
          if (!options.force) {
            logger.warn({ pid }, "Process did not stop gracefully, try --force flag");
            process.exit(1);
          }
        } else {
          logger.info({ pid }, "Scheduler daemon stopped successfully");
        }
        
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ESRCH') {
          logger.info({ pid }, "Process already stopped");
        } else {
          throw error;
        }
      }
      
    } catch (error) {
      logger.error({ error: (error as Error).message }, "Failed to stop scheduler daemon");
      process.exit(1);
    }
  });

program
  .command("scheduler:list")
  .description("List all scheduled jobs and their status")
  .option("-c, --config <path>", "Path to configuration file")
  .action(async (options) => {
    try {
      const config = await loadConfig(options.config);
      const ingestor = new Ingestor(config);
      
      await ingestor.initialize();
      const plugins = ingestor["pluginLoader"].getAllPlugins();
      
      const schedules = Array.from(plugins.entries()).map(([source, plugin]) => ({
        source,
        name: plugin.upstreamMeta.name,
        schedule: plugin.upstreamMeta.defaultSchedule || defaultScheduleConfig.defaultSchedule,
        rateLimitPerMin: plugin.upstreamMeta.rateLimitPerMin,
      }));
      
      if (schedules.length === 0) {
        logger.info("No schedulable sources found");
        return;
      }
      
      logger.info({ schedules }, "Scheduled jobs configuration");
      
      // Print formatted table
      console.log("\nScheduled Jobs:");
      console.log("===============");
      console.log(`${'Source'.padEnd(20)} ${'Name'.padEnd(30)} ${'Schedule'.padEnd(15)} ${'Rate Limit/min'.padEnd(15)}`);
      console.log('-'.repeat(80));
      
      schedules.forEach(job => {
        console.log(
          `${job.source.padEnd(20)} ${job.name.padEnd(30)} ${job.schedule.padEnd(15)} ${job.rateLimitPerMin.toString().padEnd(15)}`
        );
      });
      
      await ingestor.cleanup();
      
    } catch (error) {
      logger.error({ error: (error as Error).message }, "Failed to list scheduled jobs");
      process.exit(1);
    }
  });

program
  .command("scheduler:health")
  .description("Check health status of scheduled jobs")
  .option("--pid-file <path>", "Path to PID file", defaultScheduleConfig.pidFile)
  .action(async (options) => {
    try {
      const pidFile = options.pidFile || defaultScheduleConfig.pidFile;
      const pid = readPidFile(pidFile!);
      
      if (!pid || !isProcessRunning(pid)) {
        logger.info("Scheduler daemon is not running");
        return;
      }
      
      // TODO: Implement IPC or API to get real-time health status from running daemon
      logger.info({ pid }, "Scheduler daemon is running - health check requires IPC/API");
      console.log("✅ Scheduler daemon process is running");
      console.log("💡 Real-time health monitoring requires IPC communication (future enhancement)");
      
    } catch (error) {
      logger.error({ error: (error as Error).message }, "Failed to check scheduler health");
      process.exit(1);
    }
  });

program
  .command("scheduler:performance")
  .description("Show performance metrics for scheduled jobs")
  .option("--pid-file <path>", "Path to PID file", defaultScheduleConfig.pidFile)
  .action(async (options) => {
    try {
      const pidFile = options.pidFile || defaultScheduleConfig.pidFile;
      const pid = readPidFile(pidFile!);
      
      if (!pid || !isProcessRunning(pid)) {
        logger.info("Scheduler daemon is not running");
        return;
      }
      
      // TODO: Implement IPC or API to get real-time performance data from running daemon
      logger.info({ pid }, "Scheduler daemon is running - performance data requires IPC/API");
      console.log("📊 Performance monitoring available when daemon is running");
      console.log("💡 Real-time performance data requires IPC communication (future enhancement)");
      
    } catch (error) {
      logger.error({ error: (error as Error).message }, "Failed to get scheduler performance");
      process.exit(1);
    }
  });

program
  .command("scheduler:trigger")
  .description("Manually trigger a scheduled job for a specific source")
  .argument("<source>", "Source name to trigger")
  .option("-c, --config <path>", "Path to configuration file")
  .action(async (source: string, options) => {
    try {
      const config = await loadConfig(options.config);
      const ingestor = new Ingestor(config);
      
      logger.info({ source }, "Triggering manual ingestion for source");
      
      await ingestor.initialize();
      const result = await ingestor.ingestSource(source, 'manual_trigger');
      
      logger.info(
        {
          source: result.source,
          success: result.success,
          duration: result.duration,
          raw: result.rawCount,
          normalized: result.normalizedCount,
          new: result.newCount,
          updated: result.updatedCount,
          errors: result.errorCount,
        },
        "Manual trigger completed"
      );
      
      if (!result.success) {
        logger.error({ errors: result.errors }, "Trigger failed");
        process.exit(1);
      }
      
      await ingestor.cleanup();
    } catch (error) {
      logger.error({ error: (error as Error).message, source }, "Failed to trigger source");
      process.exit(1);
    }
  });

program
  .command("config:show")
  .description("Show current configuration")
  .option("-c, --config <path>", "Path to configuration file")
  .action(async (options) => {
    try {
      const config = await loadConfig(options.config);
      
      // Get schedule config from environment if not overridden
      const scheduleConfig = options.config ? defaultScheduleConfig : ConfigManager.loadFromEnvironment().scheduleConfig;
      
      const summary = ConfigManager.getConfigSummary(config, scheduleConfig);
      
      logger.info(summary, "Current configuration");
      
      console.log("\nConfiguration Summary:");
      console.log("======================");
      console.log(`Mode: ${summary.mode}`);
      console.log(`Schedule: ${summary.schedule}`);
      console.log(`Stagger Minutes: ${summary.staggerMinutes}`);
      console.log(`Rate Limit/min: ${summary.rateLimitPerMin}`);
      console.log(`Timeout (ms): ${summary.timeoutMs}`);
      console.log(`Enabled Sources: ${Array.isArray(summary.enabledSources) ? summary.enabledSources.join(', ') : summary.enabledSources}`);
      console.log(`Disabled Sources: ${Array.isArray(summary.disabledSources) ? summary.disabledSources.join(', ') : summary.disabledSources}`);
      console.log(`PID File: ${summary.pidFile}`);
      console.log("\nDirectories:");
      console.log(`  Raw Data: ${summary.directories.rawData}`);
      console.log(`  Normalized Data: ${summary.directories.normalizedData}`);
      console.log(`  Logs: ${summary.directories.logs}`);
      
    } catch (error) {
      logger.error({ error: (error as Error).message }, "Failed to show configuration");
      process.exit(1);
    }
  });

program
  .command("config:validate")
  .description("Validate configuration")
  .option("-c, --config <path>", "Path to configuration file")
  .action(async (options) => {
    try {
      const config = await loadConfig(options.config);
      const scheduleConfig = options.config ? defaultScheduleConfig : ConfigManager.loadFromEnvironment().scheduleConfig;
      
      const errors = ConfigManager.validateConfig(config, scheduleConfig);
      
      if (errors.length === 0) {
        logger.info("Configuration is valid");
        console.log("✅ Configuration is valid");
      } else {
        logger.error({ errors }, "Configuration validation failed");
        console.log("❌ Configuration validation failed:");
        errors.forEach(error => console.log(`  - ${error}`));
        process.exit(1);
      }
      
    } catch (error) {
      logger.error({ error: (error as Error).message }, "Failed to validate configuration");
      process.exit(1);
    }
  });

program
  .command("config:init")
  .description("Create example configuration files")
  .option("--env-file <path>", "Path to create .env file", ".env.example")
  .action((options) => {
    try {
      const envContent = ConfigManager.createExampleEnv();
      writeFileSync(options.envFile, envContent, 'utf8');
      
      console.log(`✅ Created example environment file: ${options.envFile}`);
      console.log("\nTo use this configuration:");
      console.log(`1. Copy ${options.envFile} to .env`);
      console.log("2. Edit .env with your specific values");
      console.log("3. Load the environment: source .env");
      console.log("4. Run ingestor commands");
      
    } catch (error) {
      logger.error({ error: (error as Error).message }, "Failed to create example config");
      process.exit(1);
    }
  });

// Import and add new scraper configuration commands
import { addTestScraperConfigCommand } from './commands/test-scraper-config.js';
import { addConfigManagerCommands } from './commands/config-manager.js';

// Add the new commands to the program
addTestScraperConfigCommand(program);
addConfigManagerCommands(program);

/**
 * Load configuration from file or use defaults
 */
async function loadConfig(configPath?: string): Promise<IngestorConfig> {
  if (configPath) {
    try {
      const { default: config } = await import(configPath);
      return { ...defaultConfig, ...config };
    } catch (error) {
      logger.warn({ configPath, error: (error as Error).message }, "Failed to load config file, using defaults");
    }
  }
  
  return defaultConfig;
}

// Parse command line arguments
program.parse();