import { join } from "path";
import type { Gig, ScraperRunStats, IngestorConfig } from "@gigateer/contracts";
import { GigSchema } from "@gigateer/contracts";
import { logger as defaultLogger, type Logger } from "./logger.js";
import { FileManager, type DetailedRunLog, type PerformanceMetrics } from "./file-manager.js";
import { ChangeDetector } from "./change-detector.js";
import { RateLimiter } from "./rate-limiter.js";
import { HybridPluginLoader } from "./hybrid-plugin-loader.js";
import { DatabaseManager } from "./database/index.js";

export class Ingestor {
  private fileManager: FileManager;
  private changeDetector: ChangeDetector;
  private rateLimiter: RateLimiter;
  private pluginLoader: HybridPluginLoader;
  private databaseManager: DatabaseManager;
  
  constructor(
    private readonly config: IngestorConfig,
    private readonly logger: Logger = defaultLogger
  ) {
    this.fileManager = new FileManager(
      config.rawDataDir,
      config.normalizedDataDir,
      this.logger,
      config.logDir
    );
    this.changeDetector = new ChangeDetector(this.logger);
    this.rateLimiter = new RateLimiter(this.logger);
    this.pluginLoader = new HybridPluginLoader(
      join(process.cwd(), "src/plugins"),
      join(process.cwd(), "data/scraper-configs"),
      this.logger
    );
    this.databaseManager = DatabaseManager.fromEnvironment();
  }

  /**
   * Initializes the ingestor by loading all plugins and connecting to database
   */
  async initialize(): Promise<void> {
    await this.pluginLoader.loadPlugins();
    await this.databaseManager.initialize();
  }

  /**
   * Runs ingestion for all sources
   */
  async ingestAll(): Promise<ScraperRunStats[]> {
    const pluginNames = this.pluginLoader.getPluginNames();
    const results: ScraperRunStats[] = [];

    this.logger.info({ sources: pluginNames }, "Starting ingestion for all sources");

    for (const source of pluginNames) {
      try {
        const result = await this.ingestSource(source);
        results.push(result);
      } catch (error) {
        this.logger.error(
          { source, error: (error as Error).message },
          "Failed to ingest source"
        );
        
        results.push({
          source,
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          duration: 0,
          rawCount: 0,
          normalizedCount: 0,
          newCount: 0,
          updatedCount: 0,
          errorCount: 1,
          success: false,
          errors: [(error as Error).message],
        });
      }
    }

    // Save detailed run log
    const runLog: DetailedRunLog = {
      type: "ingest_all",
      timestamp: new Date().toISOString(),
      results,
      summary: {
        totalSources: results.length,
        successfulSources: results.filter(r => r.success).length,
        failedSources: results.filter(r => !r.success).length,
        totalGigs: results.reduce((sum, r) => sum + r.normalizedCount, 0),
        totalNew: results.reduce((sum, r) => sum + r.newCount, 0),
        totalUpdated: results.reduce((sum, r) => sum + r.updatedCount, 0),
        totalErrors: results.reduce((sum, r) => sum + (r.errorCount || 0), 0),
        totalDuration: results.reduce((sum, r) => sum + (r.duration || 0), 0),
      },
    };
    
    await this.fileManager.saveRunLog(runLog);
    
    // Store bulk ingestion results in database
    await this.databaseManager.storeScraperRun('ingest_all', {
      rawCount: runLog.summary.totalGigs,
      normalizedCount: runLog.summary.totalGigs,
      newCount: runLog.summary.totalNew,
      updatedCount: runLog.summary.totalUpdated,
      errorCount: runLog.summary.totalErrors,
      success: runLog.summary.failedSources === 0,
      duration: runLog.summary.totalDuration,
      errors: results.filter(r => !r.success).flatMap(r => r.errors || [])
    }, runLog.summary);

    return results;
  }

  /**
   * Runs ingestion for a specific source
   */
  async ingestSource(source: string, logType: 'ingest_source' | 'scheduled_run' | 'manual_trigger' = 'ingest_source'): Promise<ScraperRunStats> {
    const overallStartTime = new Date();
    const performanceTimers = { fetch: 0, normalize: 0, validation: 0, save: 0 };
    
    const stats: ScraperRunStats = {
      source,
      startTime: overallStartTime.toISOString(),
      endTime: "",
      duration: 0,
      rawCount: 0,
      normalizedCount: 0,
      newCount: 0,
      updatedCount: 0,
      errorCount: 0,
      success: false,
      errors: [],
    };

    try {
      this.logger.info({ source }, "Starting ingestion for source");

      const plugin = this.pluginLoader.getPlugin(source);
      if (!plugin) {
        throw new Error(`Plugin not found for source: ${source}`);
      }

      // Fetch raw data with rate limiting and timing
      const fetchStartTime = Date.now();
      const rawData = await this.rateLimiter.schedule(
        source,
        plugin.upstreamMeta.rateLimitPerMin,
        () => plugin.fetchRaw()
      );
      performanceTimers.fetch = Date.now() - fetchStartTime;

      stats.rawCount = rawData.length;
      this.logger.info({ source, count: rawData.length, fetchMs: performanceTimers.fetch }, "Fetched raw data");

      // Save raw data
      await this.fileManager.saveRawData(source, rawData);

      // Normalize data with timing
      const normalizeStartTime = Date.now();
      const normalizedGigs = await plugin.normalize(rawData);
      performanceTimers.normalize = Date.now() - normalizeStartTime;
      
      stats.normalizedCount = normalizedGigs.length;

      // Validate normalized data with timing
      const validationStartTime = Date.now();
      const validatedGigs = this.validateGigs(normalizedGigs, source);
      performanceTimers.validation = Date.now() - validationStartTime;
      
      if (validatedGigs.length !== normalizedGigs.length) {
        const invalidCount = normalizedGigs.length - validatedGigs.length;
        stats.errorCount = (stats.errorCount || 0) + invalidCount;
        stats.errors?.push(`${invalidCount} gigs failed validation`);
        
        // Log validation errors
        await this.fileManager.saveErrorLog({
          timestamp: new Date().toISOString(),
          source,
          error: `${invalidCount} gigs failed validation`,
          context: { 
            totalGigs: normalizedGigs.length, 
            validGigs: validatedGigs.length,
            logType
          },
          severity: invalidCount > normalizedGigs.length * 0.5 ? 'high' : 'medium',
        });
        
        // Store error log in database
        await this.databaseManager.storeErrorLog(
          source,
          `${invalidCount} gigs failed validation`,
          { 
            totalGigs: normalizedGigs.length, 
            validGigs: validatedGigs.length,
            logType
          },
          invalidCount > normalizedGigs.length * 0.5 ? 'high' : 'medium'
        );
      }

      // Load previous normalized data for change detection
      const previousGigs = await this.fileManager.loadNormalizedData(source);

      // Detect changes
      const changeResult = this.changeDetector.detectChanges(validatedGigs, previousGigs);
      stats.newCount = changeResult.newGigs.length;
      stats.updatedCount = changeResult.updatedGigs.length;

      // Merge results and save with timing
      const saveStartTime = Date.now();
      const finalGigs = this.changeDetector.mergeResults(changeResult);
      
      // Save to file storage
      await this.fileManager.saveNormalizedData(source, finalGigs);
      
      // Generate batch ID for this ingestion run
      const batchId = `${source}-${new Date().toISOString()}`;
      
      // Store in database if enabled
      await this.databaseManager.storeGigs(finalGigs, source, batchId);
      
      performanceTimers.save = Date.now() - saveStartTime;

      stats.success = true;
      
      // Calculate performance metrics
      const totalDuration = Date.now() - overallStartTime.getTime();
      const gigThroughput = stats.normalizedCount > 0 ? stats.normalizedCount / (totalDuration / 1000) : 0;
      
      // Save performance metrics
      try {
        const performanceMetrics: PerformanceMetrics = {
          timestamp: new Date().toISOString(),
          source,
          metrics: {
            fetchDuration: performanceTimers.fetch,
            normalizeDuration: performanceTimers.normalize,
            validationDuration: performanceTimers.validation,
            saveDuration: performanceTimers.save,
            totalDuration,
            memoryUsage: process.memoryUsage(),
            gigThroughput,
          },
        };
        
        await this.fileManager.savePerformanceMetrics(performanceMetrics);
        
        // Store performance metrics in database
        await this.databaseManager.storePerformanceMetrics(source, {
          fetchDuration: performanceTimers.fetch,
          normalizeDuration: performanceTimers.normalize,
          validationDuration: performanceTimers.validation,
          saveDuration: performanceTimers.save,
          totalDuration,
          memoryUsage: process.memoryUsage(),
          gigThroughput,
          gigCount: stats.normalizedCount,
          errorCount: stats.errorCount || 0
        });
      } catch (error) {
        this.logger.warn({ error: (error as Error).message }, "Failed to save performance metrics");
      }
      
      this.logger.info(
        {
          source,
          logType,
          raw: stats.rawCount,
          normalized: stats.normalizedCount,
          new: stats.newCount,
          updated: stats.updatedCount,
          errors: stats.errorCount || 0,
          duration: totalDuration,
          gigThroughput: Math.round(gigThroughput * 100) / 100,
        },
        "Completed ingestion for source"
      );

    } catch (error) {
      stats.errorCount = (stats.errorCount || 0) + 1;
      stats.errors?.push((error as Error).message);
      stats.success = false;
      
      // Log critical errors
      try {
        await this.fileManager.saveErrorLog({
          timestamp: new Date().toISOString(),
          source,
          error: (error as Error).message,
          stack: (error as Error).stack,
          context: { 
            logType,
            rawCount: stats.rawCount,
            normalizedCount: stats.normalizedCount
          },
          severity: 'critical',
        });
        
        // Store error log in database
        await this.databaseManager.storeErrorLog(
          source,
          (error as Error).message,
          { 
            logType,
            rawCount: stats.rawCount,
            normalizedCount: stats.normalizedCount
          },
          'critical',
          (error as Error).stack
        );
      } catch (logError) {
        this.logger.warn({ logError: (logError as Error).message }, "Failed to save error log");
      }
      
      this.logger.error(
        { source, logType, error: (error as Error).message },
        "Failed ingestion for source"
      );
    } finally {
      const endTime = new Date();
      stats.endTime = endTime.toISOString();
      stats.duration = endTime.getTime() - overallStartTime.getTime();
      
      // Store scraper run results in database
      await this.databaseManager.storeScraperRun(logType, {
        source,
        rawCount: stats.rawCount,
        normalizedCount: stats.normalizedCount,
        newCount: stats.newCount,
        updatedCount: stats.updatedCount,
        errorCount: stats.errorCount || 0,
        success: stats.success,
        duration: stats.duration,
        errors: stats.errors
      });
    }

    return stats;
  }

  /**
   * Validates an array of gigs against the GigSchema
   */
  private validateGigs(gigs: Gig[], source: string): Gig[] {
    const validGigs: Gig[] = [];
    
    for (const gig of gigs) {
      try {
        const validatedGig = GigSchema.parse(gig);
        validGigs.push(validatedGig);
      } catch (error) {
        this.logger.warn(
          { source, gigId: gig.id, error: (error as Error).message },
          "Gig failed validation"
        );
      }
    }

    return validGigs;
  }

  /**
   * Validates all normalized data files
   */
  async validateAllNormalizedData(): Promise<{ [source: string]: { valid: number; invalid: number; errors: string[] } }> {
    const sources = await this.fileManager.listNormalizedSources();
    const results: { [source: string]: { valid: number; invalid: number; errors: string[] } } = {};

    for (const source of sources) {
      const gigs = await this.fileManager.loadNormalizedData(source);
      if (!gigs) {
        results[source] = { valid: 0, invalid: 0, errors: ["No data file found"] };
        continue;
      }

      let validCount = 0;
      let invalidCount = 0;
      const errors: string[] = [];

      for (const gig of gigs) {
        try {
          GigSchema.parse(gig);
          validCount++;
        } catch (error) {
          invalidCount++;
          errors.push(`Gig ${gig.id}: ${(error as Error).message}`);
        }
      }

      results[source] = { valid: validCount, invalid: invalidCount, errors };
    }

    return results;
  }

  /**
   * Gets statistics about all sources
   */
  async getSourceStats(): Promise<{ [source: string]: { count: number; lastUpdated?: string } }> {
    const sources = await this.fileManager.listNormalizedSources();
    const stats: { [source: string]: { count: number; lastUpdated?: string } } = {};

    for (const source of sources) {
      const gigs = await this.fileManager.loadNormalizedData(source);
      if (gigs) {
        stats[source] = {
          count: gigs.length,
          lastUpdated: gigs.length > 0 ? gigs[0].updatedAt : undefined,
        };
      }
    }

    return stats;
  }

  /**
   * Get detailed statistics including change information
   */
  async getDetailedStats(): Promise<{
    sources: { [source: string]: {
      total: number;
      new: number;
      updated: number;
      unchanged: number;
      lastUpdated?: string;
      recentChanges: Array<{
        id: string;
        title: string;
        status: 'new' | 'updated';
        venue: string;
        date: string;
      }>;
    }};
    summary: {
      totalSources: number;
      totalGigs: number;
      totalNew: number;
      totalUpdated: number;
      totalUnchanged: number;
    };
  }> {
    const sources = await this.fileManager.listNormalizedSources();
    const result = {
      sources: {} as any,
      summary: {
        totalSources: 0,
        totalGigs: 0,
        totalNew: 0,
        totalUpdated: 0,
        totalUnchanged: 0,
      }
    };

    for (const source of sources) {
      const gigs = await this.fileManager.loadNormalizedData(source);
      if (gigs && gigs.length > 0) {
        const newGigs = gigs.filter(g => g.isNew);
        const updatedGigs = gigs.filter(g => g.isUpdated);
        const unchangedGigs = gigs.filter(g => !g.isNew && !g.isUpdated);
        
        // Get recent changes (last 10 new or updated)
        const recentChanges = [...newGigs, ...updatedGigs]
          .sort((a, b) => new Date(b.lastSeenAt || b.updatedAt).getTime() - new Date(a.lastSeenAt || a.updatedAt).getTime())
          .slice(0, 10)
          .map(gig => ({
            id: gig.id,
            title: gig.title,
            status: gig.isNew ? 'new' as const : 'updated' as const,
            venue: gig.venue.name,
            date: gig.dateStart.substring(0, 10) // Just the date part
          }));

        result.sources[source] = {
          total: gigs.length,
          new: newGigs.length,
          updated: updatedGigs.length,
          unchanged: unchangedGigs.length,
          lastUpdated: gigs[0].updatedAt,
          recentChanges
        };

        // Update summary
        result.summary.totalGigs += gigs.length;
        result.summary.totalNew += newGigs.length;
        result.summary.totalUpdated += updatedGigs.length;
        result.summary.totalUnchanged += unchangedGigs.length;
      }
    }

    result.summary.totalSources = sources.length;
    return result;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.rateLimiter.cleanup();
    await this.databaseManager.cleanup();
  }
}