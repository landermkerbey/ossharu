import { loadConfig } from '../src/config';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('loadConfig', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tts-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('loads a config file from an explicitly provided path', () => {
    const configPath = path.join(tmpDir, 'my-config.json');
    fs.writeFileSync(configPath, JSON.stringify({
      voice: 'en-US-JennyNeural',
      speed: 1.0,
      outputDir: './audio',
      region: 'eastus',
      apiKey: 'test-key-123',
    }));

    const config = loadConfig({ configFile: configPath });

    expect(config.voice).toBe('en-US-JennyNeural');
    expect(config.speed).toBe(1.0);
    expect(config.outputDir).toBe('./audio');
    expect(config.region).toBe('eastus');
    expect(config.apiKey).toBe('test-key-123');
  });

  it('falls back to a config file in the current working directory', () => {
    const configPath = path.join(tmpDir, 'ossharu.config.json');
    fs.writeFileSync(configPath, JSON.stringify({
      voice: 'ja-JP-NanamiNeural',
      speed: 0.8,
      outputDir: './output',
      region: 'japaneast',
      apiKey: 'cwd-key-456',
    }));

    const originalCwd = process.cwd();
    process.chdir(tmpDir);

    try {
      const config = loadConfig();
      expect(config.voice).toBe('ja-JP-NanamiNeural');
      expect(config.speed).toBe(0.8);
      expect(config.outputDir).toBe('./output');
      expect(config.region).toBe('japaneast');
      expect(config.apiKey).toBe('cwd-key-456');
    } finally {
      process.chdir(originalCwd);
    }
  });

  it('falls back to a config file in the XDG config directory', () => {
    const xdgConfigDir = path.join(tmpDir, 'xdg-config', 'ossharu');
    fs.mkdirSync(xdgConfigDir, { recursive: true });

    const configPath = path.join(xdgConfigDir, 'config.json');
    fs.writeFileSync(configPath, JSON.stringify({
      voice: 'fr-FR-DeniseNeural',
      speed: 1.2,
      outputDir: './french',
      region: 'francecentral',
      apiKey: 'xdg-key-789',
    }));

    const originalXdgConfigHome = process.env.XDG_CONFIG_HOME;
    process.env.XDG_CONFIG_HOME = path.join(tmpDir, 'xdg-config');

    try {
      const config = loadConfig();
      expect(config.voice).toBe('fr-FR-DeniseNeural');
      expect(config.speed).toBe(1.2);
      expect(config.outputDir).toBe('./french');
      expect(config.region).toBe('francecentral');
      expect(config.apiKey).toBe('xdg-key-789');
    } finally {
      if (originalXdgConfigHome === undefined) {
	delete process.env.XDG_CONFIG_HOME;
      } else {
	process.env.XDG_CONFIG_HOME = originalXdgConfigHome;
      }
    }
  });

  it('CLI flags take precedence over config file values', () => {
    const configPath = path.join(tmpDir, 'ossharu.config.json');
    fs.writeFileSync(configPath, JSON.stringify({
      voice: 'en-US-JennyNeural',
      speed: 1.0,
      outputDir: './audio',
      region: 'eastus',
      apiKey: 'file-key-123',
    }));

    const config = loadConfig({
      configFile: configPath,
      overrides: {
	voice: 'ja-JP-NanamiNeural',
	speed: 0.75,
      },
    });

    expect(config.voice).toBe('ja-JP-NanamiNeural');
    expect(config.speed).toBe(0.75);
    expect(config.outputDir).toBe('./audio');
    expect(config.region).toBe('eastus');
    expect(config.apiKey).toBe('file-key-123');
  });

});