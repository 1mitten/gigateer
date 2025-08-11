import { promises as fs } from "fs";
import { join, dirname } from "path";
import type { Gig, ScraperRunStats } from "@gigateer/contracts";
import type { Logger } from "./logger.js";

export interface DetailedRunLog {
  type: 'ingest_all' | 'ingest_source' | 'scheduled_run' | 'manual_trigger';
  timestamp: string;
  results: ScraperRunStats[];
  summary: {
    totalSources: number;
    successfulSources: number;
    failedSources: number;
    totalGigs: number;
    totalNew: number;
    totalUpdated: number;
    totalErrors: number;
    totalDuration: number;
  };
  scheduler?: {
    uptime: number;
    runCount: number;
    errorCount: number;
  };
}

export interface PerformanceMetrics {
  timestamp: string;
  source: string;
  metrics: {
    fetchDuration: number;
    normalizeDuration: number;
    validationDuration: number;
    saveDuration: number;
    totalDuration: number;
    memoryUsage: NodeJS.MemoryUsage;
    gigThroughput: number; // gigs per second
  };
}

export class FileManager {
  private readonly rawDataDir: string;
  private readonly normalizedDataDir: string;
  private readonly logger: Logger | undefined;
  private readonly logDir: string;
  private readonly sourcesDir: string;
  private readonly catalogPath: string;
  
  constructor(baseDir: string);
  constructor(
    rawDataDir: string,
    normalizedDataDir: string,
    logger: Logger,
    logDirOverride?: string
  );
  constructor(
    rawDataDirOrBaseDir: string,
    normalizedDataDir?: string,
    logger?: Logger,
    logDirOverride?: string
  ) {
    if (arguments.length === 1) {
      // Simple constructor for tests
      this.rawDataDir = rawDataDirOrBaseDir;
      this.normalizedDataDir = rawDataDirOrBaseDir;
      this.logger = undefined as any;
      this.logDir = join(rawDataDirOrBaseDir, "run-logs");
      this.sourcesDir = join(rawDataDirOrBaseDir, "sources");
      this.catalogPath = join(rawDataDirOrBaseDir, "catalog.json");
    } else {
      // Full constructor
      this.rawDataDir = rawDataDirOrBaseDir;
      this.normalizedDataDir = normalizedDataDir || rawDataDirOrBaseDir;
      this.logger = logger;
      this.logDir = logDirOverride || join(dirname(this.rawDataDir), "run-logs");
      this.sourcesDir = join(this.rawDataDir, "sources");
      this.catalogPath = join(this.rawDataDir, "catalog.json");
    }
  }

  /**
   * Ensures directory exists, creating it if necessary
   */
  private async ensureDir(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }
  
  /**
   * Ensures all required directories exist
   */
  async ensureDirectories(): Promise<void> {
    await this.ensureDir(this.rawDataDir);
    if (this.normalizedDataDir && this.normalizedDataDir !== this.rawDataDir) {
      await this.ensureDir(this.normalizedDataDir);
    }
    await this.ensureDir(this.sourcesDir);
    await this.ensureDir(this.logDir);
  }

  /**
   * Saves raw data to JSON file
   */
  async saveRawData(source: string, data: unknown[]): Promise<void> {
    const filePath = join(this.rawDataDir, `${source}.raw.json`);
    await this.ensureDir(dirname(filePath));
    
    const jsonData = {
      source,
      fetchedAt: new Date().toISOString(),
      count: data.length,
      data,
    };
    
    await fs.writeFile(filePath, JSON.stringify(jsonData, null, 2), "utf8");
    this.logger?.debug({ source, count: data.length, filePath }, "Saved raw data");
  }

  /**
   * Loads raw data from JSON file
   */
  async loadRawData(source: string): Promise<unknown[] | null> {
    const filePath = join(this.rawDataDir, `${source}.raw.json`);
    
    try {
      const content = await fs.readFile(filePath, "utf8");
      const parsed = JSON.parse(content);
      return parsed.data || [];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }

  /**
   * Saves normalized data to JSON file
   */
  async saveNormalizedData(source: string, gigs: Gig[]): Promise<void> {
    const filePath = join(this.normalizedDataDir, `${source}.normalized.json`);
    await this.ensureDir(dirname(filePath));
    
    const jsonData = {
      source,
      normalizedAt: new Date().toISOString(),
      count: gigs.length,
      gigs,
    };
    
    await fs.writeFile(filePath, JSON.stringify(jsonData, null, 2), "utf8");
    this.logger?.debug({ source, count: gigs.length, filePath }, "Saved normalized data");
  }

  /**
   * Loads normalized data from JSON file
   */
  async loadNormalizedData(source: string): Promise<Gig[] | null> {
    const filePath = join(this.normalizedDataDir, `${source}.normalized.json`);
    
    try {
      const content = await fs.readFile(filePath, "utf8");
      const parsed = JSON.parse(content);
      return parsed.gigs || [];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }

  /**
   * Lists all available normalized data sources
   */
  async listNormalizedSources(): Promise<string[]> {
    try {
      await this.ensureDir(this.normalizedDataDir || this.rawDataDir);
      const files = await fs.readdir(this.normalizedDataDir || this.rawDataDir);
      return files
        .filter(file => file.endsWith(".normalized.json"))
        .map(file => file.replace(".normalized.json", ""));
    } catch {
      return [];
    }
  }
  
  /**
   * Write source file (for test compatibility)
   */
  async writeSourceFile(sourceName: string, data: any[]): Promise<void> {
    const filePath = join(this.sourcesDir, `${sourceName}.json`);
    await this.ensureDir(dirname(filePath));
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
    if (this.logger) {
      this.logger.debug({ sourceName, count: data.length, filePath }, "Wrote source file");
    }
  }
  
  /**
   * Read source file (for test compatibility)
   */
  async readSourceFile(sourceName: string): Promise<any[]> {
    const filePath = join(this.sourcesDir, `${sourceName}.json`);
    
    try {
      const content = await fs.readFile(filePath, "utf8");
      return JSON.parse(content);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }
  
  /**
   * Write catalog file (for test compatibility)
   */
  async writeCatalog(catalog: any[]): Promise<void> {
    await this.ensureDir(dirname(this.catalogPath));
    await fs.writeFile(this.catalogPath, JSON.stringify(catalog, null, 2), "utf8");
    if (this.logger) {
      this.logger.debug({ count: catalog.length, filePath: this.catalogPath }, "Wrote catalog file");
    }
  }
  
  /**
   * Read catalog file (for test compatibility)
   */
  async readCatalog(): Promise<any[]> {
    try {
      const content = await fs.readFile(this.catalogPath, "utf8");
      return JSON.parse(content);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }
  
  /**
   * List sources (for test compatibility)
   */
  async listSources(): Promise<string[]> {
    try {
      await this.ensureDir(this.sourcesDir);
      const files = await fs.readdir(this.sourcesDir);
      return files
        .filter(file => file.endsWith('.json') && !file.includes('catalog'))
        .map(file => file.replace('.json', ''));
    } catch {
      return [];
    }
  }

  /**
   * Saves detailed run log to file
   */
  async saveRunLog(logData: DetailedRunLog): Promise<void> {
    await this.ensureDir(this.logDir);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filePath = join(this.logDir, `run-${logData.type}-${timestamp}.json`);
    
    await fs.writeFile(filePath, JSON.stringify(logData, null, 2), "utf8");
    this.logger?.debug({ filePath, type: logData.type }, "Saved detailed run log");
  }
  
  /**
   * Saves performance metrics to file
   */
  async savePerformanceMetrics(metrics: PerformanceMetrics): Promise<void> {
    await this.ensureDir(this.logDir);
    
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const filePath = join(this.logDir, `performance-${date}.jsonl`);
    
    // Append to JSONL file for time-series data
    const line = JSON.stringify(metrics) + '\n';
    await fs.appendFile(filePath, line, "utf8");
    
    this.logger?.debug({ source: metrics.source, filePath }, "Saved performance metrics");
  }
  
  /**
   * Saves scheduler status snapshot
   */
  async saveSchedulerSnapshot(snapshot: {
    timestamp: string;
    status: any;
    jobStatuses: Array<{
      source: string;
      status: string;
      lastRun?: Date;
      nextRun?: Date;
      runCount: number;
      errorCount: number;
      lastError?: string;
    }>;
  }): Promise<void> {
    await this.ensureDir(this.logDir);
    
    const date = new Date().toISOString().split('T')[0];
    const filePath = join(this.logDir, `scheduler-snapshots-${date}.jsonl`);
    
    const line = JSON.stringify(snapshot) + '\n';
    await fs.appendFile(filePath, line, "utf8");
    
    this.logger?.debug({ filePath }, "Saved scheduler snapshot");
  }
  
  /**
   * Saves error tracking information
   */
  async saveErrorLog(errorData: {
    timestamp: string;
    source: string;
    error: string;
    stack?: string;
    context: Record<string, any>;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }): Promise<void> {
    await this.ensureDir(this.logDir);
    
    const date = new Date().toISOString().split('T')[0];
    const filePath = join(this.logDir, `errors-${date}.jsonl`);
    
    const line = JSON.stringify(errorData) + '\n';
    await fs.appendFile(filePath, line, "utf8");
    
    this.logger?.debug({ source: errorData.source, severity: errorData.severity }, "Saved error log");
  }
  
  /**
   * Gets run log files within date range
   */
  async getRunLogs(startDate?: Date, endDate?: Date): Promise<string[]> {
    try {
      await this.ensureDir(this.logDir);
      const files = await fs.readdir(this.logDir);
      
      return files
        .filter(file => file.startsWith('run-') && file.endsWith('.json'))
        .filter(file => {
          if (!startDate && !endDate) return true;
          
          // Extract timestamp from filename
          const match = file.match(/run-.+-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/);
          if (!match) return false;
          
          const fileDate = new Date(match[1].replace(/-/g, ':'));
          if (startDate && fileDate < startDate) return false;
          if (endDate && fileDate > endDate) return false;
          
          return true;
        })
        .sort();
    } catch {
      return [];
    }
  }
  
  /**
   * Gets performance metrics summary for a date range
   */
  async getPerformanceMetrics(startDate?: Date, endDate?: Date): Promise<PerformanceMetrics[]> {
    try {
      await this.ensureDir(this.logDir);
      const files = await fs.readdir(this.logDir);
      const metrics: PerformanceMetrics[] = [];
      
      const performanceFiles = files.filter(file => 
        file.startsWith('performance-') && file.endsWith('.jsonl')
      );
      
      for (const file of performanceFiles) {
        const content = await fs.readFile(join(this.logDir, file), 'utf8');
        const lines = content.trim().split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const metric = JSON.parse(line) as PerformanceMetrics;
            const metricDate = new Date(metric.timestamp);
            
            if (startDate && metricDate < startDate) continue;
            if (endDate && metricDate > endDate) continue;
            
            metrics.push(metric);
          } catch (error) {
            this.logger?.warn({ line, error: (error as Error).message }, "Failed to parse performance metric");
          }
        }
      }
      
      return metrics.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    } catch {
      return [];
    }
  }
  
  /**
   * Cleans up old log files
   */
  async cleanupLogs(retentionDays: number = 30): Promise<void> {
    try {
      await this.ensureDir(this.logDir);
      const files = await fs.readdir(this.logDir);
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
      
      let deletedCount = 0;
      
      for (const file of files) {
        const filePath = join(this.logDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
          deletedCount++;
          this.logger?.debug({ file }, "Deleted old log file");
        }
      }
      
      this.logger?.info({ deletedCount, retentionDays }, "Log cleanup completed");
    } catch (error) {
      this.logger?.error({ error: (error as Error).message }, "Failed to cleanup logs");
    }
  }
}