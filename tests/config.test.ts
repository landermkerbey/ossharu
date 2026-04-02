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

  // ---------------------------------------------------------------------------
  // Existing flat-config behaviour
  // ---------------------------------------------------------------------------

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

  it('throws if apiKey is missing from the config file', () => {
    const configPath = path.join(tmpDir, 'bad-config.json');
    fs.writeFileSync(configPath, JSON.stringify({
      voice: 'ja-JP-NanamiNeural',
      speed: 1.0,
      outputDir: './audio',
      region: 'japaneast',
      // apiKey intentionally omitted
    }));

    expect(() => loadConfig({ configFile: configPath })).toThrow(/apiKey/);
  });

  it('throws if region is missing from the config file', () => {
    const configPath = path.join(tmpDir, 'bad-config.json');
    fs.writeFileSync(configPath, JSON.stringify({
      voice: 'ja-JP-NanamiNeural',
      speed: 1.0,
      outputDir: './audio',
      apiKey: 'test-key',
      // region intentionally omitted
    }));

    expect(() => loadConfig({ configFile: configPath })).toThrow(/region/);
  });

  it('throws if voice is missing from the config file', () => {
    const configPath = path.join(tmpDir, 'bad-config.json');
    fs.writeFileSync(configPath, JSON.stringify({
      speed: 1.0,
      outputDir: './audio',
      region: 'japaneast',
      apiKey: 'test-key',
      // voice intentionally omitted
    }));

    expect(() => loadConfig({ configFile: configPath })).toThrow(/voice/);
  });

  it('throws if outputDir is missing from the config file', () => {
    const configPath = path.join(tmpDir, 'bad-config.json');
    fs.writeFileSync(configPath, JSON.stringify({
      voice: 'ja-JP-NanamiNeural',
      speed: 1.0,
      region: 'japaneast',
      apiKey: 'test-key',
      // outputDir intentionally omitted
    }));

    expect(() => loadConfig({ configFile: configPath })).toThrow(/outputDir/);
  });

  it('walks up the directory tree to find a config file in a parent directory', () => {
    const configPath = path.join(tmpDir, 'ossharu.config.json');
    fs.writeFileSync(configPath, JSON.stringify({
      voice: 'ja-JP-NanamiNeural',
      speed: 1.0,
      outputDir: './audio',
      region: 'japaneast',
      apiKey: 'parent-key',
    }));

    const childDir = path.join(tmpDir, 'text');
    fs.mkdirSync(childDir);

    const originalCwd = process.cwd();
    process.chdir(childDir);

    try {
      const config = loadConfig();
      expect(config.apiKey).toBe('parent-key');
    } finally {
      process.chdir(originalCwd);
    }
  });

  // ---------------------------------------------------------------------------
  // XDG config: legacy flat format backward compatibility
  // ---------------------------------------------------------------------------

  it('XDG config in the legacy flat format still loads correctly without --profile', () => {
    const xdgConfigDir = path.join(tmpDir, 'xdg-config', 'ossharu');
    fs.mkdirSync(xdgConfigDir, { recursive: true });
    fs.writeFileSync(path.join(xdgConfigDir, 'config.json'), JSON.stringify({
      voice: 'ja-JP-NanamiNeural',
      speed: 1.0,
      outputDir: './audio',
      region: 'japaneast',
      apiKey: 'legacy-key',
    }));

    const originalXdgConfigHome = process.env.XDG_CONFIG_HOME;
    process.env.XDG_CONFIG_HOME = path.join(tmpDir, 'xdg-config');

    try {
      const config = loadConfig();
      expect(config.apiKey).toBe('legacy-key');
      expect(config.voice).toBe('ja-JP-NanamiNeural');
    } finally {
      if (originalXdgConfigHome === undefined) {
        delete process.env.XDG_CONFIG_HOME;
      } else {
        process.env.XDG_CONFIG_HOME = originalXdgConfigHome;
      }
    }
  });

  it('throws a helpful error when --profile is used with a legacy flat XDG config', () => {
    const xdgConfigDir = path.join(tmpDir, 'xdg-config', 'ossharu');
    fs.mkdirSync(xdgConfigDir, { recursive: true });
    fs.writeFileSync(path.join(xdgConfigDir, 'config.json'), JSON.stringify({
      voice: 'ja-JP-NanamiNeural',
      speed: 1.0,
      outputDir: './audio',
      region: 'japaneast',
      apiKey: 'legacy-key',
    }));

    const originalXdgConfigHome = process.env.XDG_CONFIG_HOME;
    process.env.XDG_CONFIG_HOME = path.join(tmpDir, 'xdg-config');

    try {
      expect(() => loadConfig({ profile: 'japanese' }))
        .toThrow(/legacy single-config format/);
    } finally {
      if (originalXdgConfigHome === undefined) {
        delete process.env.XDG_CONFIG_HOME;
      } else {
        process.env.XDG_CONFIG_HOME = originalXdgConfigHome;
      }
    }
  });

  // ---------------------------------------------------------------------------
  // XDG config: profiled format
  // ---------------------------------------------------------------------------

  function writeXdgProfiledConfig(
    xdgBase: string,
    content: object,
  ): void {
    const dir = path.join(xdgBase, 'ossharu');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'config.json'), JSON.stringify(content));
  }

  it('selects a named profile from the XDG config when --profile is passed', () => {
    const xdgBase = path.join(tmpDir, 'xdg-config');
    writeXdgProfiledConfig(xdgBase, {
      profiles: {
        japanese: {
          voice: 'ja-JP-NanamiNeural',
          speed: 1.0,
          outputDir: './japanese',
          region: 'japaneast',
          apiKey: 'jp-key',
        },
        french: {
          voice: 'fr-FR-DeniseNeural',
          speed: 1.2,
          outputDir: './french',
          region: 'francecentral',
          apiKey: 'fr-key',
        },
      },
    });

    const originalXdgConfigHome = process.env.XDG_CONFIG_HOME;
    process.env.XDG_CONFIG_HOME = xdgBase;

    try {
      const config = loadConfig({ profile: 'french' });
      expect(config.voice).toBe('fr-FR-DeniseNeural');
      expect(config.apiKey).toBe('fr-key');
      expect(config.region).toBe('francecentral');
    } finally {
      if (originalXdgConfigHome === undefined) {
        delete process.env.XDG_CONFIG_HOME;
      } else {
        process.env.XDG_CONFIG_HOME = originalXdgConfigHome;
      }
    }
  });

  it('overrides still apply on top of a selected profile', () => {
    const xdgBase = path.join(tmpDir, 'xdg-config');
    writeXdgProfiledConfig(xdgBase, {
      profiles: {
        japanese: {
          voice: 'ja-JP-NanamiNeural',
          speed: 1.0,
          outputDir: './japanese',
          region: 'japaneast',
          apiKey: 'jp-key',
        },
      },
    });

    const originalXdgConfigHome = process.env.XDG_CONFIG_HOME;
    process.env.XDG_CONFIG_HOME = xdgBase;

    try {
      const config = loadConfig({ profile: 'japanese', overrides: { speed: 0.75 } });
      expect(config.voice).toBe('ja-JP-NanamiNeural');
      expect(config.speed).toBe(0.75);
    } finally {
      if (originalXdgConfigHome === undefined) {
        delete process.env.XDG_CONFIG_HOME;
      } else {
        process.env.XDG_CONFIG_HOME = originalXdgConfigHome;
      }
    }
  });

  it('auto-selects the only profile when no --profile is passed and only one exists', () => {
    const xdgBase = path.join(tmpDir, 'xdg-config');
    writeXdgProfiledConfig(xdgBase, {
      profiles: {
        japanese: {
          voice: 'ja-JP-NanamiNeural',
          speed: 1.0,
          outputDir: './japanese',
          region: 'japaneast',
          apiKey: 'jp-key',
        },
      },
    });

    const originalXdgConfigHome = process.env.XDG_CONFIG_HOME;
    process.env.XDG_CONFIG_HOME = xdgBase;

    try {
      const config = loadConfig();
      expect(config.voice).toBe('ja-JP-NanamiNeural');
      expect(config.apiKey).toBe('jp-key');
    } finally {
      if (originalXdgConfigHome === undefined) {
        delete process.env.XDG_CONFIG_HOME;
      } else {
        process.env.XDG_CONFIG_HOME = originalXdgConfigHome;
      }
    }
  });

  it('uses defaultProfile when no --profile is passed and multiple profiles exist', () => {
    const xdgBase = path.join(tmpDir, 'xdg-config');
    writeXdgProfiledConfig(xdgBase, {
      defaultProfile: 'japanese',
      profiles: {
        japanese: {
          voice: 'ja-JP-NanamiNeural',
          speed: 1.0,
          outputDir: './japanese',
          region: 'japaneast',
          apiKey: 'jp-key',
        },
        french: {
          voice: 'fr-FR-DeniseNeural',
          speed: 1.2,
          outputDir: './french',
          region: 'francecentral',
          apiKey: 'fr-key',
        },
      },
    });

    const originalXdgConfigHome = process.env.XDG_CONFIG_HOME;
    process.env.XDG_CONFIG_HOME = xdgBase;

    try {
      const config = loadConfig();
      expect(config.voice).toBe('ja-JP-NanamiNeural');
      expect(config.apiKey).toBe('jp-key');
    } finally {
      if (originalXdgConfigHome === undefined) {
        delete process.env.XDG_CONFIG_HOME;
      } else {
        process.env.XDG_CONFIG_HOME = originalXdgConfigHome;
      }
    }
  });

  it('throws a helpful error when multiple profiles exist but no --profile or defaultProfile is set', () => {
    const xdgBase = path.join(tmpDir, 'xdg-config');
    writeXdgProfiledConfig(xdgBase, {
      profiles: {
        japanese: {
          voice: 'ja-JP-NanamiNeural',
          speed: 1.0,
          outputDir: './japanese',
          region: 'japaneast',
          apiKey: 'jp-key',
        },
        french: {
          voice: 'fr-FR-DeniseNeural',
          speed: 1.2,
          outputDir: './french',
          region: 'francecentral',
          apiKey: 'fr-key',
        },
      },
    });

    const originalXdgConfigHome = process.env.XDG_CONFIG_HOME;
    process.env.XDG_CONFIG_HOME = xdgBase;

    try {
      expect(() => loadConfig()).toThrow(/Multiple profiles found/);
      expect(() => loadConfig()).toThrow(/japanese/);
      expect(() => loadConfig()).toThrow(/french/);
    } finally {
      if (originalXdgConfigHome === undefined) {
        delete process.env.XDG_CONFIG_HOME;
      } else {
        process.env.XDG_CONFIG_HOME = originalXdgConfigHome;
      }
    }
  });

  it('throws when --profile names a profile that does not exist', () => {
    const xdgBase = path.join(tmpDir, 'xdg-config');
    writeXdgProfiledConfig(xdgBase, {
      profiles: {
        japanese: {
          voice: 'ja-JP-NanamiNeural',
          speed: 1.0,
          outputDir: './japanese',
          region: 'japaneast',
          apiKey: 'jp-key',
        },
      },
    });

    const originalXdgConfigHome = process.env.XDG_CONFIG_HOME;
    process.env.XDG_CONFIG_HOME = xdgBase;

    try {
      expect(() => loadConfig({ profile: 'nonexistent' }))
        .toThrow(/Profile "nonexistent" not found/);
    } finally {
      if (originalXdgConfigHome === undefined) {
        delete process.env.XDG_CONFIG_HOME;
      } else {
        process.env.XDG_CONFIG_HOME = originalXdgConfigHome;
      }
    }
  });

  it('throws when defaultProfile references a profile that does not exist', () => {
    const xdgBase = path.join(tmpDir, 'xdg-config');
    writeXdgProfiledConfig(xdgBase, {
      defaultProfile: 'typo',
      profiles: {
        japanese: {
          voice: 'ja-JP-NanamiNeural',
          speed: 1.0,
          outputDir: './japanese',
          region: 'japaneast',
          apiKey: 'jp-key',
        },
      },
    });

    const originalXdgConfigHome = process.env.XDG_CONFIG_HOME;
    process.env.XDG_CONFIG_HOME = xdgBase;

    try {
      expect(() => loadConfig()).toThrow(/defaultProfile "typo"/);
    } finally {
      if (originalXdgConfigHome === undefined) {
        delete process.env.XDG_CONFIG_HOME;
      } else {
        process.env.XDG_CONFIG_HOME = originalXdgConfigHome;
      }
    }
  });

  it('throws a helpful error when --profile is used but no XDG config file exists', () => {
    const originalXdgConfigHome = process.env.XDG_CONFIG_HOME;
    // Point XDG at an empty directory so no config.json exists.
    process.env.XDG_CONFIG_HOME = path.join(tmpDir, 'empty-xdg');

    try {
      expect(() => loadConfig({ profile: 'japanese' }))
        .toThrow(/--profile requires the XDG config file/);
    } finally {
      if (originalXdgConfigHome === undefined) {
        delete process.env.XDG_CONFIG_HOME;
      } else {
        process.env.XDG_CONFIG_HOME = originalXdgConfigHome;
      }
    }
  });

  it('--profile skips the local ancestor config and reads from XDG instead', () => {
    // Plant a local config that would normally win the ancestor walk.
    const localConfigPath = path.join(tmpDir, 'ossharu.config.json');
    fs.writeFileSync(localConfigPath, JSON.stringify({
      voice: 'en-US-JennyNeural',
      speed: 1.0,
      outputDir: './local',
      region: 'eastus',
      apiKey: 'local-key',
    }));

    // Also create an XDG config with a profile.
    const xdgBase = path.join(tmpDir, 'xdg-config');
    writeXdgProfiledConfig(xdgBase, {
      profiles: {
        japanese: {
          voice: 'ja-JP-NanamiNeural',
          speed: 1.0,
          outputDir: './japanese',
          region: 'japaneast',
          apiKey: 'xdg-key',
        },
      },
    });

    const originalXdgConfigHome = process.env.XDG_CONFIG_HOME;
    const originalCwd = process.cwd();
    process.env.XDG_CONFIG_HOME = xdgBase;
    process.chdir(tmpDir);

    try {
      const config = loadConfig({ profile: 'japanese' });
      expect(config.apiKey).toBe('xdg-key');
      expect(config.voice).toBe('ja-JP-NanamiNeural');
    } finally {
      process.chdir(originalCwd);
      if (originalXdgConfigHome === undefined) {
        delete process.env.XDG_CONFIG_HOME;
      } else {
        process.env.XDG_CONFIG_HOME = originalXdgConfigHome;
      }
    }
  });
});
