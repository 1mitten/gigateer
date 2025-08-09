import * as cron from "node-cron";
import { writeFileSync, readFileSync, unlinkSync, existsSync } from "fs";
import { join } from "path";
import type { IngestorConfig, ScraperRunStats } from "@gigateer/contracts";
import { Ingestor } from "./ingestor.js";
import { logger, type Logger } from "./logger.js";

export interface ScheduleConfig {
  /** Whether to enable scheduled runs */
  enabled: boolean;
  /** Global default schedule (overridden by plugin-specific schedules) */
  defaultSchedule: string;
  /** Whether to stagger plugin runs to avoid spikes */
  staggerMinutes?: number;
  /** Development vs production mode */
  mode?: 'development' | 'production';
  /** Enabled/disabled sources */
  enabledSources?: string[];
  /** Disabled sources */
  disabledSources?: string[];
  /** PID file path for daemon mode */
  pidFile?: string;
}

export interface ScheduledJob {
  source: string;
  schedule: string;
  task: cron.ScheduledTask;
  plugin: any;
  lastRun?: Date;
  nextRun?: Date;
  runCount: number;
  errorCount: number;
  lastError?: string;
  status: 'scheduled' | 'running' | 'stopped' | 'error';
}

export interface SchedulerStatus {
  isRunning: boolean;
  startTime: Date;
  totalJobs: number;
  runningJobs: number;
  stoppedJobs: number;
  errorJobs: number;
  jobs: ScheduledJob[];
  uptime: number;
}

export class Scheduler {
  private jobs: Map<string, ScheduledJob> = new Map();
  private ingestor: Ingestor;
  private isRunning = false;
  private startTime?: Date;
  private healthCheckInterval?: NodeJS.Timeout;
  
  constructor(
    private readonly ingestorConfig: IngestorConfig,
    private readonly scheduleConfig: ScheduleConfig,
    private readonly logger: Logger = logger
  ) {
    this.ingestor = new Ingestor(ingestorConfig, this.logger);
  }

  /**
   * Starts the scheduler and sets up cron jobs
   */
  async start(): Promise<void> {
    if (!this.scheduleConfig.enabled) {
      this.logger.info("Scheduler disabled");
      return;
    }

    if (this.isRunning) {
      this.logger.warn("Scheduler is already running");
      return;
    }

    this.startTime = new Date();
    this.isRunning = true;
    
    // Write PID file if configured
    if (this.scheduleConfig.pidFile) {
      this.writePidFile();
    }

    await this.ingestor.initialize();
    const plugins = this.ingestor["pluginLoader"].getAllPlugins();
    
    let staggerOffset = 0;
    const staggerMinutes = this.scheduleConfig.staggerMinutes || 0;

    for (const [source, plugin] of plugins) {
      // Skip disabled sources
      if (this.isSourceDisabled(source)) {
        this.logger.info({ source }, "Source disabled, skipping");
        continue;
      }

      const schedule = plugin.upstreamMeta.defaultSchedule || this.scheduleConfig.defaultSchedule;
      let adjustedSchedule = schedule;

      // Apply development mode adjustments
      if (this.scheduleConfig.mode === 'development') {
        // In development, run more frequently for testing
        adjustedSchedule = this.adjustScheduleForDevelopment(schedule);
      }

      // Apply stagger offset if configured
      if (staggerMinutes > 0 && staggerOffset > 0) {
        adjustedSchedule = this.adjustSchedule(adjustedSchedule, staggerOffset);
      }

      const task = cron.schedule(adjustedSchedule, async () => {
        await this.runScheduledJob(source);
      }, {
        scheduled: false,
        timezone: 'UTC',
      });

      const job: ScheduledJob = {
        source,
        schedule: adjustedSchedule,
        task,
        plugin,
        runCount: 0,
        errorCount: 0,
        status: 'scheduled',
      };

      this.jobs.set(source, job);
      staggerOffset += staggerMinutes;

      this.logger.info(
        { source, schedule: adjustedSchedule, name: plugin.upstreamMeta.name },
        "Scheduled plugin"
      );
    }

    // Start all tasks
    for (const job of this.jobs.values()) {
      job.task.start();
      job.nextRun = this.getNextRunTime(job.schedule);
    }
    
    // Start health check monitoring
    this.startHealthCheck();
    
    this.logger.info(
      { taskCount: this.jobs.size, mode: this.scheduleConfig.mode },
      "Scheduler started with cron jobs"
    );
  }

  /**
   * Stops the scheduler and all cron jobs
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      this.logger.warn("Scheduler is not running");
      return;
    }

    this.logger.info("Stopping scheduler...");
    
    // Stop health check
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    // Stop all cron jobs
    for (const job of this.jobs.values()) {
      if (job.task) {
        job.task.stop();
        // node-cron uses stop() instead of destroy()
      }
      job.status = 'stopped';
    }
    
    // Wait for any running jobs to complete (with timeout)
    const runningJobs = Array.from(this.jobs.values()).filter(job => job.status === 'running');
    if (runningJobs.length > 0) {
      this.logger.info({ count: runningJobs.length }, "Waiting for running jobs to complete...");
      
      const timeout = 30000; // 30 seconds
      const startWait = Date.now();
      
      while (runningJobs.some(job => job.status === 'running') && Date.now() - startWait < timeout) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    this.jobs.clear();
    await this.ingestor.cleanup();
    
    // Remove PID file
    if (this.scheduleConfig.pidFile) {
      this.removePidFile();
    }
    
    this.isRunning = false;
    this.startTime = undefined;
    
    this.logger.info("Scheduler stopped");
  }

  /**
   * Gets detailed status of the scheduler and all jobs
   */
  getStatus(): SchedulerStatus {
    const jobs = Array.from(this.jobs.values());
    
    return {
      isRunning: this.isRunning,
      startTime: this.startTime || new Date(),
      totalJobs: jobs.length,
      runningJobs: jobs.filter(job => job.status === 'running').length,
      stoppedJobs: jobs.filter(job => job.status === 'stopped').length,
      errorJobs: jobs.filter(job => job.status === 'error').length,
      jobs: jobs.map(job => ({
        source: job.source,
        schedule: job.schedule,
        lastRun: job.lastRun,
        nextRun: job.nextRun,
        runCount: job.runCount,
        errorCount: job.errorCount,
        lastError: job.lastError,
        status: job.status,
      })) as ScheduledJob[],
      uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
    };
  }
  
  /**
   * Starts a specific source's scheduled job
   */
  async startSource(source: string): Promise<boolean> {
    const job = this.jobs.get(source);
    if (!job) {
      this.logger.error({ source }, "Job not found");
      return false;
    }
    
    if (job.status === 'running') {
      this.logger.warn({ source }, "Job is already running");
      return false;
    }
    
    job.task.start();
    job.status = 'scheduled';
    job.nextRun = this.getNextRunTime(job.schedule);
    
    this.logger.info({ source }, "Started scheduled job");
    return true;
  }
  
  /**
   * Stops a specific source's scheduled job
   */
  async stopSource(source: string): Promise<boolean> {
    const job = this.jobs.get(source);
    if (!job) {
      this.logger.error({ source }, "Job not found");
      return false;
    }
    
    job.task.stop();
    job.status = 'stopped';
    job.nextRun = undefined;
    
    this.logger.info({ source }, "Stopped scheduled job");
    return true;
  }
  
  /**
   * Manually triggers a job run for a specific source
   */
  async triggerSource(source: string): Promise<boolean> {
    const job = this.jobs.get(source);
    if (!job) {
      this.logger.error({ source }, "Job not found");
      return false;
    }
    
    if (job.status === 'running') {
      this.logger.warn({ source }, "Job is already running");
      return false;
    }
    
    // Run the job immediately
    await this.runScheduledJob(source);
    return true;
  }
  
  /**
   * Gets health status of all jobs
   */
  getHealthStatus(): {
    overall: 'healthy' | 'warning' | 'critical';
    issues: Array<{
      type: 'error' | 'stuck' | 'stale';
      source: string;
      message: string;
      timestamp: Date;
    }>;
    stats: {
      totalJobs: number;
      healthyJobs: number;
      errorJobs: number;
      stuckJobs: number;
      staleJobs: number;
    };
  } {
    const status = this.getStatus();
    const issues: Array<{
      type: 'error' | 'stuck' | 'stale';
      source: string;
      message: string;
      timestamp: Date;
    }> = [];
    
    let healthyJobs = 0;
    let errorJobs = 0;
    let stuckJobs = 0;
    let staleJobs = 0;
    
    const now = new Date();
    
    for (const job of status.jobs) {
      if (job.status === 'error') {
        errorJobs++;
        issues.push({
          type: 'error',
          source: job.source,
          message: job.lastError || 'Unknown error',
          timestamp: job.lastRun || now,
        });
      } else if (job.status === 'running' && job.lastRun && now.getTime() - job.lastRun.getTime() > 30 * 60 * 1000) {
        stuckJobs++;
        issues.push({
          type: 'stuck',
          source: job.source,
          message: `Job running for ${Math.floor((now.getTime() - job.lastRun.getTime()) / 60000)} minutes`,
          timestamp: job.lastRun,
        });
      } else if (job.lastRun && now.getTime() - job.lastRun.getTime() > 24 * 60 * 60 * 1000) {
        staleJobs++;
        issues.push({
          type: 'stale',
          source: job.source,
          message: `Last run ${Math.floor((now.getTime() - job.lastRun.getTime()) / (24 * 60 * 60 * 1000))} days ago`,
          timestamp: job.lastRun,
        });
      } else {
        healthyJobs++;
      }
    }
    
    // Determine overall health
    let overall: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (errorJobs > 0 || stuckJobs > 0) {
      overall = 'critical';
    } else if (staleJobs > 0) {
      overall = 'warning';
    }
    
    return {
      overall,
      issues,
      stats: {
        totalJobs: status.totalJobs,
        healthyJobs,
        errorJobs,
        stuckJobs,
        staleJobs,
      },
    };
  }
  
  /**
   * Gets performance summary for all jobs
   */
  getPerformanceSummary(): {
    totalRuns: number;
    totalErrors: number;
    successRate: number;
    averageRunsPerJob: number;
    jobs: Array<{
      source: string;
      runCount: number;
      errorCount: number;
      successRate: number;
      lastRun?: Date;
      nextRun?: Date;
    }>;
  } {
    const jobs = Array.from(this.jobs.values());
    
    const totalRuns = jobs.reduce((sum, job) => sum + job.runCount, 0);
    const totalErrors = jobs.reduce((sum, job) => sum + job.errorCount, 0);
    const successRate = totalRuns > 0 ? ((totalRuns - totalErrors) / totalRuns) * 100 : 0;
    const averageRunsPerJob = jobs.length > 0 ? totalRuns / jobs.length : 0;
    
    return {
      totalRuns,
      totalErrors,
      successRate: Math.round(successRate * 100) / 100,
      averageRunsPerJob: Math.round(averageRunsPerJob * 100) / 100,
      jobs: jobs.map(job => ({
        source: job.source,
        runCount: job.runCount,
        errorCount: job.errorCount,
        successRate: job.runCount > 0 ? Math.round(((job.runCount - job.errorCount) / job.runCount) * 10000) / 100 : 0,
        lastRun: job.lastRun,
        nextRun: job.nextRun,
      })),
    };
  }

  /**
   * Runs a scheduled job for a specific source
   */
  private async runScheduledJob(source: string): Promise<void> {
    const job = this.jobs.get(source);
    if (!job) {
      this.logger.error({ source }, "Job not found for scheduled run");
      return;
    }
    
    if (job.status === 'running') {
      this.logger.warn({ source }, "Job is already running, skipping");
      return;
    }
    
    const startTime = new Date();
    job.status = 'running';
    job.lastRun = startTime;
    job.runCount++;
    
    this.logger.info({ source, runCount: job.runCount }, "Running scheduled ingestion");
    
    try {
      const result = await this.ingestor.ingestSource(source, 'scheduled_run');
      
      // Update job status
      job.status = 'scheduled';
      job.nextRun = this.getNextRunTime(job.schedule);
      
      if (!result.success) {
        job.errorCount++;
        job.lastError = result.errors?.join('; ') || 'Unknown error';
      }
      
      this.logger.info(
        {
          source,
          success: result.success,
          duration: result.duration,
          new: result.newCount,
          updated: result.updatedCount,
          errors: result.errorCount,
          runCount: job.runCount,
        },
        "Scheduled ingestion completed"
      );
      
    } catch (error) {
      job.status = 'error';
      job.errorCount++;
      job.lastError = (error as Error).message;
      job.nextRun = this.getNextRunTime(job.schedule);
      
      this.logger.error(
        { source, error: (error as Error).message, runCount: job.runCount },
        "Scheduled ingestion failed"
      );
    }
  }
  
  /**
   * Starts health check monitoring
   */
  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        const status = this.getStatus();
        
        this.logger.debug(
          {
            uptime: Math.floor(status.uptime / 1000),
            totalJobs: status.totalJobs,
            runningJobs: status.runningJobs,
            errorJobs: status.errorJobs,
          },
          "Health check"
        );
        
        // Log error jobs and try to restart them
        const errorJobs = status.jobs.filter(job => job.status === 'error');
        if (errorJobs.length > 0) {
          this.logger.warn(
            { errorJobs: errorJobs.map(j => ({ source: j.source, lastError: j.lastError })) },
            "Jobs in error state detected"
          );
          
          // Auto-restart jobs that have been in error state for more than 30 minutes
          for (const job of errorJobs) {
            if (job.lastRun && Date.now() - job.lastRun.getTime() > 30 * 60 * 1000) {
              this.logger.info({ source: job.source }, "Auto-restarting job after error state timeout");
              await this.startSource(job.source);
            }
          }
        }
        
        // Check for stuck jobs (running for more than 30 minutes)
        const stuckJobs = status.jobs.filter(job => 
          job.status === 'running' && 
          job.lastRun && 
          Date.now() - job.lastRun.getTime() > 30 * 60 * 1000
        );
        
        if (stuckJobs.length > 0) {
          this.logger.warn(
            { stuckJobs: stuckJobs.map(j => ({ source: j.source, lastRun: j.lastRun })) },
            "Stuck jobs detected (running for >30 minutes)"
          );
        }
        
        // Save scheduler snapshot for monitoring
        try {
          // Use duck typing since we need access to FileManager through Ingestor
          const fileManager = (this.ingestor as any).fileManager;
          if (fileManager && fileManager.saveSchedulerSnapshot) {
            await fileManager.saveSchedulerSnapshot({
              timestamp: new Date().toISOString(),
              status: {
                isRunning: status.isRunning,
                uptime: status.uptime,
                totalJobs: status.totalJobs,
                runningJobs: status.runningJobs,
                stoppedJobs: status.stoppedJobs,
                errorJobs: status.errorJobs,
              },
              jobStatuses: status.jobs.map(job => ({
                source: job.source,
                status: job.status,
                lastRun: job.lastRun,
                nextRun: job.nextRun,
                runCount: job.runCount,
                errorCount: job.errorCount,
                lastError: job.lastError,
              })),
            });
          }
        } catch (error) {
          this.logger.debug({ error: (error as Error).message }, "Failed to save scheduler snapshot");
        }
        
      } catch (error) {
        this.logger.error({ error: (error as Error).message }, "Health check failed");
      }
      
    }, 60000); // Every minute
  }
  
  /**
   * Checks if a source is disabled
   */
  private isSourceDisabled(source: string): boolean {
    const { enabledSources, disabledSources } = this.scheduleConfig;
    
    // If enabledSources is specified, source must be in it
    if (enabledSources && enabledSources.length > 0) {
      return !enabledSources.includes(source);
    }
    
    // If disabledSources is specified, source must not be in it
    if (disabledSources && disabledSources.length > 0) {
      return disabledSources.includes(source);
    }
    
    return false;
  }
  
  /**
   * Adjusts schedule for development mode
   */
  private adjustScheduleForDevelopment(schedule: string): string {
    // In development, run every 10 minutes instead of hours
    if (schedule.includes('*/')) {
      return '*/10 * * * *'; // Every 10 minutes
    }
    return schedule;
  }
  
  /**
   * Gets the next run time for a cron schedule
   */
  private getNextRunTime(schedule: string): Date {
    try {
      // node-cron doesn't expose nextRun method, so we'll calculate it ourselves
      // For now, return current time + 1 minute as placeholder
      const now = new Date();
      now.setMinutes(now.getMinutes() + 1);
      return now;
    } catch (error) {
      this.logger.warn({ schedule, error: (error as Error).message }, "Failed to get next run time");
      return new Date();
    }
  }
  
  /**
   * Writes PID file for daemon management
   */
  private writePidFile(): void {
    if (!this.scheduleConfig.pidFile) return;
    
    try {
      writeFileSync(this.scheduleConfig.pidFile, process.pid.toString());
      this.logger.info({ pidFile: this.scheduleConfig.pidFile, pid: process.pid }, "PID file written");
    } catch (error) {
      this.logger.error({ pidFile: this.scheduleConfig.pidFile, error: (error as Error).message }, "Failed to write PID file");
    }
  }
  
  /**
   * Removes PID file
   */
  private removePidFile(): void {
    if (!this.scheduleConfig.pidFile || !existsSync(this.scheduleConfig.pidFile)) return;
    
    try {
      unlinkSync(this.scheduleConfig.pidFile);
      this.logger.info({ pidFile: this.scheduleConfig.pidFile }, "PID file removed");
    } catch (error) {
      this.logger.error({ pidFile: this.scheduleConfig.pidFile, error: (error as Error).message }, "Failed to remove PID file");
    }
  }
  
  /**
   * Adjusts a cron schedule by adding minutes offset
   */
  private adjustSchedule(schedule: string, offsetMinutes: number): string {
    const parts = schedule.split(" ");
    if (parts.length !== 5) {
      this.logger.warn({ schedule }, "Invalid cron schedule, using as-is");
      return schedule;
    }

    // Parse minutes part
    let minutes = parseInt(parts[1]);
    if (isNaN(minutes) || parts[1] === "*") {
      // If minutes is *, randomly distribute
      minutes = Math.floor(Math.random() * 60);
    } else {
      minutes = (minutes + offsetMinutes) % 60;
    }

    parts[1] = minutes.toString();
    const adjustedSchedule = parts.join(" ");
    
    this.logger.debug(
      { original: schedule, adjusted: adjustedSchedule, offsetMinutes },
      "Adjusted schedule for staggering"
    );
    
    return adjustedSchedule;
  }
}

/**
 * Reads PID from PID file
 */
export function readPidFile(pidFile: string): number | null {
  try {
    if (!existsSync(pidFile)) return null;
    const pidStr = readFileSync(pidFile, 'utf8').trim();
    const pid = parseInt(pidStr);
    return isNaN(pid) ? null : pid;
  } catch {
    return null;
  }
}

/**
 * Checks if a process is running
 */
export function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}