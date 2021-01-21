import * as path from 'path';
import { writeFileSync, removeSync, pathExists, readdir, readFile } from 'fs-extra';

import { TSParseError } from '@j.u.p.iter/custom-error';

import { TSConfig } from '.';


const getValidConfigContent = () => (
  JSON.stringify({
    extends: path.resolve(__dirname, '..', 'node_modules/@j.u.p.iter/jupiter-scripts/dist/lib/config/tsconfig.json'),  
  })
);

const getInvalidConfigContent = () => (
  JSON.stringify({
    hello: "./src"
  })
);

const validateConfig = config => {
  expect(config).toHaveProperty('moduleResolution');
}

const getCacheFolderPath = () => path.resolve(__dirname, 'cache');
const getPathToConfig = (configName) => path.resolve(__dirname, '..', configName);

describe('TSConfig', () => {
  let configName;

  afterEach(async () => {
    removeSync(getCacheFolderPath());
    configName && removeSync(getPathToConfig(configName));
  });

  it('throws an error if there is no such a config', async () => {
    configName = 'tsconfig.json';

    const tsConfig = new TSConfig({
      configPath: configName,
      cacheFolderPath: getCacheFolderPath(),
    });

    await expect(
      tsConfig.parse()
    ).rejects.toThrow(`There is no typescript config by this path: ${getPathToConfig(configName)}`);
  });

  it('reads config by provided config path and create cache folder by provided path', async () => {
    configName = 'tsconfig.json';

    writeFileSync(
      getPathToConfig(configName),
      getValidConfigContent(),
      'utf8'
    );

    const tsConfig = new TSConfig({
      configPath: configName,
      cacheFolderPath: getCacheFolderPath(),
    });

    await expect(pathExists(getCacheFolderPath())).resolves.toBe(false);

    const parsedConfig = await tsConfig.parse();

    validateConfig(parsedConfig);

    await expect(pathExists(getCacheFolderPath())).resolves.toBe(true);

    const [cachedFileName] = await readdir(path.join(getCacheFolderPath(), configName.replace('.json', '')));

    const cachedFileContent = await readFile(path.resolve(getCacheFolderPath(), configName.replace('.json', ''), cachedFileName), 'utf8');

    expect(parsedConfig).toEqual(JSON.parse(cachedFileContent));
  });

  it('throws an error if the config is invalid', async () => {
    configName = 'tsconfig.json';

    writeFileSync(
      getPathToConfig(configName),
      getInvalidConfigContent(),
      'utf8'
    );

    const tsConfig = new TSConfig({
      configPath: configName,
      cacheFolderPath: getCacheFolderPath(),
    });

    await expect(tsConfig.parse()).rejects.toThrow(TSParseError);
  });
});
