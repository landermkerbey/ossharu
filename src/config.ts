import * as fs from 'fs';
import * as path from 'path';

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

export function loadConfig(options: LoadConfigOptions = {}): TtsConfig {
  if (options.configFile) {
    const raw = fs.readFileSync(options.configFile, 'utf-8');
    return JSON.parse(raw) as TtsConfig;
  }

  const cwdConfig = path.join(process.cwd(), 'tts.config.json');
  if (fs.existsSync(cwdConfig)) {
    const raw = fs.readFileSync(cwdConfig, 'utf-8');
    return JSON.parse(raw) as TtsConfig;
  }

  throw new Error('No config source provided');
}