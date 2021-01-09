import * as path from 'path';
import { writeFileSync, remove, pathExists } from 'fs-extra';

import { TSConfig } from '.';


const getValidConfigContent = () => (
  JSON.stringify({
    compilerOptions: {
      "target": "ES5",
    }  
  })
);

const getInvalidConfigContent = () => (
  JSON.stringify({
    hello: "./src"
  })
);

const getCacheFolderPath = () => path.resolve(__dirname, 'cache');
const getPathToConfig = () => path.resolve(__dirname, '..', 'tsconfig1.json');

describe('TSConfig', () => {
  beforeEach(() => {
    remove(getCacheFolderPath());
    remove(getPathToConfig());
  });

  it('throws an error if there is no such a config', async () => {
    const tsConfig = new TSConfig({
      configPath: 'tsconfig1.json',
      cacheFolderPath: getCacheFolderPath(),
    });

    await expect(tsConfig.parse()).rejects.toThrow(`There is no typescript config by this path: ${getPathToConfig()}`);
  });

  it.only('reads config by provided config path anc create cache folder by provided path', async () => {
    writeFileSync(
      getPathToConfig(),
      getValidConfigContent(),
      'utf8'
    );

    const tsConfig = new TSConfig({
      configPath: 'tsconfig1.json',
      cacheFolderPath: getCacheFolderPath(),
    });

    await expect(pathExists(getCacheFolderPath())).resolves.toBe(false);

    await expect(tsConfig.parse()).resolves.toBe(getValidConfigContent());

    await expect(pathExists(getCacheFolderPath())).resolves.toBe(true);
  });

  it('throws an error if the config is invalid', async () => {
    writeFileSync(
      getPathToConfig(),
      getInvalidConfigContent(),
      'utf8'
    );

    const tsConfig = new TSConfig({
      configPath: 'tsconfig1.json',
      cacheFolderPath: getCacheFolderPath(),
    });

    await expect(tsConfig.parse()).rejects.toThrow('hello');
  });
});
