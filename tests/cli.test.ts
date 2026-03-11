import { runCli } from '../src/cli';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('runCli', () => {
  let tmpDir: string;
  let mockSynthesize: jest.Mock;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ossharu-cli-test-'));
    mockSynthesize = jest.fn().mockResolvedValue(Buffer.from('fake-audio'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('synthesizes speech from a text argument and reports the output path', async () => {
    const configPath = path.join(tmpDir, 'ossharu.config.json');
    fs.writeFileSync(configPath, JSON.stringify({
      voice: 'ja-JP-NanamiNeural',
      speed: 1.0,
      outputDir: tmpDir,
      region: 'japaneast',
      apiKey: 'test-key',
    }));

    const output: string[] = [];

    await runCli({
      argv: ['node', 'ossharu', '--config', configPath, 'こんにちは'],
      synthesizer: mockSynthesize,
      onOutput: (line) => output.push(line),
    });

    expect(mockSynthesize).toHaveBeenCalledWith({
      text: 'こんにちは',
      voice: 'ja-JP-NanamiNeural',
      speed: 1.0,
    });
    expect(output).toHaveLength(1);
    expect(output[0]).toMatch(/こんにちは/);
    expect(output[0]).toMatch(/\.mp3$/);
  });
});