import { findPathToFile } from "@j.u.p.iter/find-path-to-file";
import { CacheParams, InFilesCache } from "@j.u.p.iter/in-files-cache";
import { SystemErrorCode } from "@j.u.p.iter/system-error-code";
import { readFileSync } from "fs";
import path from "path";
import { readConfigFile } from "typescript";

/**
 * Sometimes we need to register the TypeScript compiler programmatically
 *   with "tsNode.register(tsConfig)".
 *
 *   E.g. we do like this:
 *     - in the custom repl;
 *     - in the test runner.
 *
 * For such cases we need to read the TypeScript config by ourself.
 *
 * This class serves exactly for this purpose.
 *
 * What it does is:
 *   - reads the TypeScript config, using the TS API (readConfigFile method).
 *   - caches TS config until it's content or location are changed.
 *
 */
export class TSConfig {
  private configPath = null;

  private cacheFolderPath = null;

  /**
   * We read the config's raw content to use the content in the InFilesCache.
   *   The presence of the config is the mandatory requirement. So, if there's no
   *   the config in the application we throw an appropriate error.
   *
   */
  private async getConfigRawContent(): Promise<string | null> {
    const pathToConfig = await this.resolvePathToConfig();

    try {
      const fileContent = this.readFile(pathToConfig);

      return fileContent;
    } catch (error) {
      if (error.code === SystemErrorCode.NO_FILE_OR_DIRECTORY) {
        throw new Error(
          `There is no typescript config by this path: ${pathToConfig}`
        );
      }

      throw error;
    }
  }

  /**
   * We cache parsed tsconfig result not to parse
   *   it everytime we use it.
   *   The cache will be updated as soon as the config's content
   *   or location are changed.
   *
   */
  private cache: InFilesCache | null = null;

  /**
   * Default path to the config. You can reassign it with
   *   the "configPath" option.
   *
   */
  private defaultPathToConfig: string = "./tsconfig.json";

  /**
   * Detects the root path to the project by location of
   *   the "package.json" file internally.
   *
   */
  private async getAppRootFolderPath() {
    const { dirPath } = await findPathToFile("package.json");

    return dirPath;
  }

  /**
   * Initialise cache instance. We use it to store parsed
   *   config result.
   *
   */
  private async initCache() {
    if (!this.cache) {
      this.cache = new InFilesCache(this.cacheFolderPath);
    }
  }

  /**
   * Calculate cache params, that are used to get/set the cache.
   *
   */
  private async getCacheParams(): Promise<CacheParams> {
    const appRootFolderPath = await this.getAppRootFolderPath();
    const configRawContent = await this.getConfigRawContent();
    const resolvedPathToConfig = await this.resolvePathToConfig();

    return {
      filePath: path.resolve(appRootFolderPath, resolvedPathToConfig),
      fileContent: configRawContent,
      fileExtension: ".json"
    };
  }

  /**
   * The config's path should be relative to the app's root folder.
   *   Here we create the absolute path to the config to make it
   *   univeral and independent from the file's location, that uses
   *   this path.
   *
   */
  private async resolvePathToConfig() {
    const appRootFolderPath = await this.getAppRootFolderPath();

    return path.resolve(appRootFolderPath, this.configPath);
  }

  /**
   * We need to converth the output into the String,
   *   becuase readConfigFile expects the method, that returns the String.
   *   Otherwise the TS compiltion error will be emitted.
   *
   */
  private readFile(pathToConfig) {
    return readFileSync(pathToConfig).toString();
  }

  /**
   * We read the config file, using TS API (readConfigFile).
   *   It validates the config and:
   *   - if it's valid - returns parsed config;
   *   - if it's not valid - returns an error.
   *
   *   Internally this method is pretty big (because of multiple validation steps),
   *   so, it's better to cache it.
   *
   */
  private async readConfig() {
    const resolvedPathToConfig = await this.resolvePathToConfig();

    const { error, config } = readConfigFile(
      resolvedPathToConfig,
      this.readFile
    );

    if (error) {
      throw new Error(
        `An error occured while reading the configuration file: ${resolvedPathToConfig}`
      );
    }

    return config;
  }

  constructor(options: { configPath?: string; cacheFolderPath: string }) {
    this.configPath = options.configPath || this.defaultPathToConfig;
    this.cacheFolderPath = options.cacheFolderPath;
  }

  /**
   * Parses TS config
   *
   */
  public async parse() {
    await this.initCache();

    const configFromCache = await this.cache.get(await this.getCacheParams());

    if (configFromCache) {
      return configFromCache;
    }

    const config = await this.readConfig();

    await this.cache.set(await this.getCacheParams(), config);

    return config;
  }
}
