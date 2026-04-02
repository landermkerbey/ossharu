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

export interface XdgConfigFile {
  defaultProfile?: string;
  profiles: Record<string, TtsConfig>;
}

export interface LoadConfigOptions {
  configFile?: string;
  profile?: string;
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

function readRawConfigFile(filePath: string): unknown {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

function isProfiledConfig(raw: unknown): raw is XdgConfigFile {
  return typeof raw === 'object' && raw !== null && 'profiles' in raw;
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

function resolveFromXdgConfig(
  parsed: unknown,
  profileName: string | undefined,
  xdgConfigPath: string,
): TtsConfig {
  if (!isProfiledConfig(parsed)) {
    if (profileName !== undefined) {
      throw new Error(
        `--profile was specified but the XDG config at ${xdgConfigPath} uses the ` +
        `legacy single-config format. Migrate it to the profiles format to use --profile.`,
      );
    }
    return parsed as TtsConfig;
  }

  const profileNames = Object.keys(parsed.profiles);

  if (profileName !== undefined) {
    if (!(profileName in parsed.profiles)) {
      throw new Error(
        `Profile "${profileName}" not found in ${xdgConfigPath}. ` +
        `Available profiles: ${profileNames.join(', ')}`,
      );
    }
    return parsed.profiles[profileName]!;
  }

  // No --profile given; figure out which profile to use automatically.
  //
  // Check defaultProfile first: if the user explicitly set it, always honour
  // and validate it — even when there happens to be only one profile.
  if (parsed.defaultProfile !== undefined) {
    if (!(parsed.defaultProfile in parsed.profiles)) {
      throw new Error(
        `defaultProfile "${parsed.defaultProfile}" in ${xdgConfigPath} does not match any profile. ` +
        `Available profiles: ${profileNames.join(', ')}`,
      );
    }
    return parsed.profiles[parsed.defaultProfile]!;
  }

  if (profileNames.length === 1) {
    return parsed.profiles[profileNames[0]!]!;
  }

  throw new Error(
    `Multiple profiles found in ${xdgConfigPath} but no --profile was specified ` +
    `and no defaultProfile is set. ` +
    `Available profiles: ${profileNames.join(', ')}. ` +
    `Pass --profile <name> or add a "defaultProfile" field to your config.`,
  );
}

export function loadConfig(options: LoadConfigOptions = {}): TtsConfig {
  let base: TtsConfig | null = null;

  if (options.configFile) {
    base = readConfigFile(options.configFile);
  } else if (options.profile !== undefined) {
    // --profile: skip local ancestor walk entirely, go straight to XDG config.
    const xdgConfig = path.join(getXdgConfigDir(), XDG_CONFIG_FILENAME);
    if (!fs.existsSync(xdgConfig)) {
      throw new Error(
        `--profile requires the XDG config file to exist at:\n  ${xdgConfig}`,
      );
    }
    const parsed = readRawConfigFile(xdgConfig);
    base = resolveFromXdgConfig(parsed, options.profile, xdgConfig);
  } else {
    const cwdConfig = findConfigInAncestors(process.cwd());
    if (cwdConfig) {
      base = readConfigFile(cwdConfig);
    } else {
      const xdgConfig = path.join(getXdgConfigDir(), XDG_CONFIG_FILENAME);
      if (fs.existsSync(xdgConfig)) {
        const parsed = readRawConfigFile(xdgConfig);
        base = resolveFromXdgConfig(parsed, undefined, xdgConfig);
      }
    }
  }

  if (!base) {
    const cwdConfig = path.join(process.cwd(), LOCAL_CONFIG_FILENAME);
    const xdgConfig = path.join(getXdgConfigDir(), XDG_CONFIG_FILENAME);
    throw new Error(
      `No config found. Provide --config, or place a config file at:\n` +
      `  ${cwdConfig}\n` +
      `  ${xdgConfig}`,
    );
  }

  const merged = { ...base, ...options.overrides };
  validateConfig(merged);
  return merged;
}
