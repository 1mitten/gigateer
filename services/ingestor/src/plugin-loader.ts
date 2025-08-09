import { promises as fs } from "fs";
import { join, extname } from "path";
import type { ScraperPlugin } from "@gigateer/contracts";
import type { Logger } from "./logger.js";

export class PluginLoader {
  private plugins: Map<string, ScraperPlugin> = new Map();
  private pluginDir: string;

  constructor(pluginDir: string, private readonly logger: Logger) {
    this.pluginDir = pluginDir;
  }

  /**
   * Loads all scraper plugins from the plugins directory
   */
  async loadPlugins(): Promise<void> {
    try {
      const files = await fs.readdir(this.pluginDir);
      const pluginFiles = files.filter(file => 
        (file.endsWith(".js") || file.endsWith(".ts")) && !file.endsWith(".test.ts")
      );

      for (const file of pluginFiles) {
        await this.loadPlugin(file);
      }

      this.logger.info(
        { count: this.plugins.size, plugins: Array.from(this.plugins.keys()) },
        "Loaded scraper plugins"
      );
    } catch (error) {
      this.logger.error({ error: (error as Error).message, pluginDir: this.pluginDir }, "Failed to load plugins directory");
    }
  }

  /**
   * Loads a single plugin file
   */
  private async loadPlugin(filename: string): Promise<void> {
    const filePath = join(this.pluginDir, filename);
    const sourceName = filename.replace(extname(filename), "");

    try {
      const module = await import(filePath);
      const plugin: ScraperPlugin = module.default || module;

      // Validate plugin interface
      if (!this.validatePlugin(plugin)) {
        throw new Error("Plugin does not implement required interface");
      }

      this.plugins.set(sourceName, plugin);
      
      this.logger.debug(
        { 
          source: sourceName, 
          name: plugin.upstreamMeta.name,
          rateLimitPerMin: plugin.upstreamMeta.rateLimitPerMin,
          schedule: plugin.upstreamMeta.defaultSchedule
        }, 
        "Loaded plugin"
      );
    } catch (error) {
      this.logger.error(
        { error: (error as Error).message, filename, filePath },
        "Failed to load plugin"
      );
    }
  }

  /**
   * Validates that an object implements the ScraperPlugin interface
   */
  private validatePlugin(plugin: any): plugin is ScraperPlugin {
    return (
      plugin &&
      typeof plugin.fetchRaw === "function" &&
      typeof plugin.normalize === "function" &&
      plugin.upstreamMeta &&
      typeof plugin.upstreamMeta.name === "string" &&
      typeof plugin.upstreamMeta.rateLimitPerMin === "number" &&
      typeof plugin.upstreamMeta.defaultSchedule === "string"
    );
  }

  /**
   * Gets a specific plugin by source name
   */
  getPlugin(source: string): ScraperPlugin | undefined {
    return this.plugins.get(source);
  }

  /**
   * Gets all loaded plugins
   */
  getAllPlugins(): Map<string, ScraperPlugin> {
    return new Map(this.plugins);
  }

  /**
   * Gets the names of all loaded plugins
   */
  getPluginNames(): string[] {
    return Array.from(this.plugins.keys());
  }

  /**
   * Reloads all plugins (useful for development)
   */
  async reloadPlugins(): Promise<void> {
    this.plugins.clear();
    await this.loadPlugins();
  }
}