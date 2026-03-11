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

const REQUIRED_FIELDS: (keyof TtsConfig)[] = ['apiKey', 'region', 'voice', 'outputDir'];

function validateConfig(config: TtsConfig): void {
  for (const field of REQUIRED_FIELDS) {
    if (!config[field]) {
      throw new Error(`Config is invalid: ${field} is required but was not provided.`);
    }
  }
}

function findConfigInAncestors(dir: string): string | null {
  const home = os.homedir();
  let current = dir;

  while (true) {
    const candidate = path.join(current, LOCAL_CONFIG_FILENAME);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
    if (current === home) {
      return null;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      // reached filesystem root without finding home
      return null;
    }
    current = parent;
  }
}

export function loadConfig(options: LoadConfigOptions = {}): TtsConfig {
  let base: TtsConfig | null = null;

  if (options.configFile) {
    base = readConfigFile(options.configFile);
  } else {
    const cwdConfig = findConfigInAncestors(process.cwd());
    if (cwdConfig) {
      base = readConfigFile(cwdConfig);
    }
    else {
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