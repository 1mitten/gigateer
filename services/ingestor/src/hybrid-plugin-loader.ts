import { join } from "path";
import type { ScraperPlugin } from "@gigateer/contracts";
import type { Logger } from "./logger.js";
import { PluginLoader } from "./plugin-loader.js";
import { ConfigDrivenPluginLoader } from "./config-driven-plugin-loader.js";

/**
 * Hybrid plugin loader that combines traditional TypeScript plugins with configuration-driven plugins
 * This allows for a transition period and maximum flexibility
 */
export class HybridPluginLoader {
  private traditionalLoader: PluginLoader;
  private configDrivenLoader: ConfigDrivenPluginLoader;
  private plugins: Map<string, ScraperPlugin> = new Map();

  constructor(
    pluginDir: string,
    configDir: string,
    private readonly logger: Logger
  ) {
    this.traditionalLoader = new PluginLoader(pluginDir, logger);
    this.configDrivenLoader = new ConfigDrivenPluginLoader(configDir, logger);
  }

  /**
   * Loads both traditional plugins and configuration-driven plugins
   */
  async loadPlugins(): Promise<void> {
    this.logger.info("Loading plugins from both traditional files and configurations...");

    try {
      // Load traditional TypeScript plugins
      await this.traditionalLoader.loadPlugins();
      const traditionalPlugins = this.traditionalLoader.getAllPlugins();
      
      this.logger.info(
        { count: traditionalPlugins.size },
        "Loaded traditional TypeScript plugins"
      );

      // Load configuration-driven plugins
      await this.configDrivenLoader.loadPlugins();
      const configDrivenPlugins = this.configDrivenLoader.getAllPlugins();
      
      this.logger.info(
        { count: configDrivenPlugins.size },
        "Loaded configuration-driven plugins"
      );

      // Combine both types of plugins
      // Configuration-driven plugins take precedence over traditional ones with the same name
      for (const [name, plugin] of traditionalPlugins) {
        this.plugins.set(name, plugin);
      }
      
      for (const [name, plugin] of configDrivenPlugins) {
        if (this.plugins.has(name)) {
          this.logger.info(
            { source: name },
            "Configuration-driven plugin overriding traditional plugin"
          );
        }
        this.plugins.set(name, plugin);
      }

      this.logger.info(
        { 
          totalPlugins: this.plugins.size,
          traditionalPlugins: traditionalPlugins.size,
          configDrivenPlugins: configDrivenPlugins.size,
          sources: Array.from(this.plugins.keys())
        },
        "Successfully loaded all plugins"
      );

    } catch (error) {
      this.logger.error(
        { error: (error as Error).message },
        "Failed to load plugins"
      );
      throw error;
    }
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
   * Gets plugin count
   */
  getPluginCount(): number {
    return this.plugins.size;
  }

  /**
   * Checks if a specific plugin exists
   */
  hasPlugin(source: string): boolean {
    return this.plugins.has(source);
  }

  /**
   * Gets breakdown of plugin types
   */
  getPluginBreakdown(): {
    total: number;
    traditional: number;
    configDriven: number;
    sources: {
      traditional: string[];
      configDriven: string[];
      all: string[];
    };
  } {
    const traditionalSources = this.traditionalLoader.getPluginNames();
    const configDrivenSources = this.configDrivenLoader.getPluginNames();
    
    return {
      total: this.plugins.size,
      traditional: traditionalSources.length,
      configDriven: configDrivenSources.length,
      sources: {
        traditional: traditionalSources,
        configDriven: configDrivenSources,
        all: Array.from(this.plugins.keys())
      }
    };
  }

  /**
   * Reloads all plugins (useful for development)
   */
  async reloadPlugins(): Promise<void> {
    this.plugins.clear();
    await this.loadPlugins();
  }

  /**
   * Get configuration-driven loader for direct access
   */
  getConfigDrivenLoader(): ConfigDrivenPluginLoader {
    return this.configDrivenLoader;
  }

  /**
   * Get traditional loader for direct access
   */
  getTraditionalLoader(): PluginLoader {
    return this.traditionalLoader;
  }
}