import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const APP_NAME = 'ossharu';
const LOCAL_CONFIG_FILENAME = `${APP_NAME}.config.json`;
const XDG_CONFIG_FILENAME = 'config.json';

export interface TtsConfig {
  voice: string;
  speed: number;
  outputDir: string;
  region: string;
  apiKey: string;
}

export interface LoadConfigOptions {
  configFile?: string;
  overrides?: Partial<TtsConfig>;
}

function getXdgConfigDir(): string {
  const xdgConfigHome = process.env.XDG_CONFIG_HOME ||
    path.join(os.homedir(), '.config');
  return path.join(xdgConfigHome, APP_NAME);
}

function readConfigFile(filePath: string): TtsConfig {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as TtsConfig;
}

function validateConfig(config: TtsConfig): void {
  if (!config.apiKey) {
    throw new Error(
      'Config is invalid: apiKey is required but was not provided.'
    );
  }
}

export function loadConfig(options: LoadConfigOptions = {}): TtsConfig {
  let base: TtsConfig | null = null;

  if (options.configFile) {
    base = readConfigFile(options.configFile);
  } else {
    const cwdConfig = path.join(process.cwd(), LOCAL_CONFIG_FILENAME);
    if (fs.existsSync(cwdConfig)) {
      base = readConfigFile(cwdConfig);
    } else {
      const xdgConfig = path.join(getXdgConfigDir(), XDG_CONFIG_FILENAME);
      if (fs.existsSync(xdgConfig)) {
        base = readConfigFile(xdgConfig);
      }
    }
  }

  if (!base) {
    const cwdConfig = path.join(process.cwd(), LOCAL_CONFIG_FILENAME);
    const xdgConfig = path.join(getXdgConfigDir(), XDG_CONFIG_FILENAME);
    throw new Error(
      `No config found. Provide --config, or place a config file at:\n` +
      `  ${cwdConfig}\n` +
      `  ${xdgConfig}`
    );
  }

  const merged = { ...base, ...options.overrides };
  validateConfig(merged);
  return merged;
}