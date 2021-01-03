import { findPathToFile } from "@j.u.p.iter/find-path-to-file";
import { CacheParams, InFilesCache } from "@j.u.p.iter/in-files-cache";
import { SystemErrorCode } from "@j.u.p.iter/system-error-code";
import { readFileSync } from "fs";
import path from "path";
import { readConfigFile } from "typescript";

export class TSConfig {
  private cacheFolderPath = null;

  private configPath = null;
  /**
   * We read the config to use the content in the InFilesCache
   *
   */
  private async getConfigRawContent(): Promise<string | null> {
    const pathToConfig = await this.resolvePathToConfig();

    try {
      const fileContent = readFileSync(pathToConfig, "utf8");

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
   * We cache parsed tsconfig result not to compile
   *   it everytime we need it.
   *
   */
  private cache: InFilesCache | null = null;

  /**
   * Config name should always be called "tsconfig.json"
   *
   */
  private name: string = "tsconfig.json";

  /**
   * Detects the root path to the project by location of
   *   the "package.json" file internally.
   *
   */
  private async getAppRootFolderPath() {
    const { dirPath } = await findPathToFile("package.json");

    return dirPath;
  }

  private async initCache() {
    if (!this.cache) {
      this.cache = new InFilesCache(this.cacheFolderPath);
    }
  }

  private async getCacheParams(): Promise<CacheParams> {
    const appRootFolderPath = await this.getAppRootFolderPath();
    const configRawContent = await this.getConfigRawContent();

    return {
      filePath: path.resolve(appRootFolderPath, this.name),
      fileContent: configRawContent,
      fileExtension: ".json"
    };
  }

  private async resolvePathToConfig() {
    const appRootFolderPath = await this.getAppRootFolderPath();

    return path.resolve(appRootFolderPath, this.configPath);
  }

  private async readConfig() {
    const resolvedPathToConfig = await this.resolvePathToConfig();

    const { error, config } = readConfigFile(
      resolvedPathToConfig,
      readFileSync
    );

    if (error) {
      throw new Error(
        `An error occured while reading the configuration file: ${resolvedPathToConfig}`
      );
    }

    return config;
  }

  constructor(options: { configPath?: string; cacheFolderPath: string }) {
    this.configPath = options.configPath;
    this.cacheFolderPath = options.cacheFolderPath;
  }

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
