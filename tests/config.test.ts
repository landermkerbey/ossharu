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
});