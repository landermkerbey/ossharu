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
}

function getXdgConfigDir(): string {
  const xdgConfigHome = process.env.XDG_CONFIG_HOME ||
    path.join(os.homedir(), '.config');
  return path.join(xdgConfigHome, APP_NAME);
}

export function loadConfig(options: LoadConfigOptions = {}): TtsConfig {
  if (options.configFile) {
    const raw = fs.readFileSync(options.configFile, 'utf-8');
    return JSON.parse(raw) as TtsConfig;
  }

  const cwdConfig = path.join(process.cwd(), LOCAL_CONFIG_FILENAME);
  if (fs.existsSync(cwdConfig)) {
    const raw = fs.readFileSync(cwdConfig, 'utf-8');
    return JSON.parse(raw) as TtsConfig;
  }

  const xdgConfig = path.join(getXdgConfigDir(), XDG_CONFIG_FILENAME);
  if (fs.existsSync(xdgConfig)) {
    const raw = fs.readFileSync(xdgConfig, 'utf-8');
    return JSON.parse(raw) as TtsConfig;
  }

  throw new Error(
    `No config found. Provide --config, or place a config file at:\n` +
    `  ${cwdConfig}\n` +
    `  ${xdgConfig}`
  );
}