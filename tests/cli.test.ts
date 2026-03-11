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

  it('CLI flags take precedence over config file values', async () => {
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
      argv: [
	'node', 'ossharu',
	'--config', configPath,
	'--voice', 'ja-JP-KeitaNeural',
	'--speed', '0.75',
	'おはようございます',
      ],
      synthesizer: mockSynthesize,
      onOutput: (line) => output.push(line),
    });

    expect(mockSynthesize).toHaveBeenCalledWith({
      text: 'おはようございます',
      voice: 'ja-JP-KeitaNeural',
      speed: 0.75,
    });
  });

  it('batch input synthesizes one file per entry', async () => {
    const configPath = path.join(tmpDir, 'ossharu.config.json');
    fs.writeFileSync(configPath, JSON.stringify({
      voice: 'ja-JP-NanamiNeural',
      speed: 1.0,
      outputDir: tmpDir,
      region: 'japaneast',
      apiKey: 'test-key',
    }));

    const batchPath = path.join(tmpDir, 'batch.json');
    fs.writeFileSync(batchPath, JSON.stringify([
      { text: 'おはようございます', voice: 'ja-JP-NanamiNeural', speed: 0.75 },
      { text: 'こんにちは' },
      { text: 'おやすみなさい', speed: 1.25 },
    ]));

    const output: string[] = [];

    await runCli({
      argv: ['node', 'ossharu', '--config', configPath, '--batch', batchPath],
      synthesizer: mockSynthesize,
      onOutput: (line) => output.push(line),
    });

    expect(mockSynthesize).toHaveBeenCalledTimes(3);
    expect(mockSynthesize).toHaveBeenNthCalledWith(1, {
      text: 'おはようございます',
      voice: 'ja-JP-NanamiNeural',
      speed: 0.75,
    });
    expect(mockSynthesize).toHaveBeenNthCalledWith(2, {
      text: 'こんにちは',
      voice: 'ja-JP-NanamiNeural',
      speed: 1.0,
    });
    expect(mockSynthesize).toHaveBeenNthCalledWith(3, {
      text: 'おやすみなさい',
      voice: 'ja-JP-NanamiNeural',
      speed: 1.25,
    });
    expect(output).toHaveLength(3);
  });

  it('enters interactive mode when no text argument or batch file is provided', async () => {
    const configPath = path.join(tmpDir, 'ossharu.config.json');
    fs.writeFileSync(configPath, JSON.stringify({
      voice: 'ja-JP-NanamiNeural',
      speed: 1.0,
      outputDir: tmpDir,
      region: 'japaneast',
      apiKey: 'test-key',
    }));

    const output: string[] = [];
    const inputLines = ['こんにちは', 'さようなら', ''];

    await runCli({
      argv: ['node', 'ossharu', '--config', configPath],
      synthesizer: mockSynthesize,
      onOutput: (line) => output.push(line),
      onPrompt: (question, callback) => {
	callback(inputLines.shift() ?? '');
      },
    });

    expect(mockSynthesize).toHaveBeenCalledTimes(2);
    expect(mockSynthesize).toHaveBeenNthCalledWith(1, {
      text: 'こんにちは',
      voice: 'ja-JP-NanamiNeural',
      speed: 1.0,
    });
    expect(mockSynthesize).toHaveBeenNthCalledWith(2, {
      text: 'さようなら',
      voice: 'ja-JP-NanamiNeural',
      speed: 1.0,
    });
    expect(output).toHaveLength(4);
    expect(output[0]).toMatch(/interactive mode/);
    expect(output[1]).toMatch(/\.mp3$/);
    expect(output[2]).toMatch(/\.mp3$/);
    expect(output[3]).toMatch(/Exiting/);
  });

  it('aborts batch processing on the first synthesizer failure', async () => {
    const configPath = path.join(tmpDir, 'ossharu.config.json');
    fs.writeFileSync(configPath, JSON.stringify({
      voice: 'ja-JP-NanamiNeural',
      speed: 1.0,
      outputDir: tmpDir,
      region: 'japaneast',
      apiKey: 'test-key',
    }));

    const batchPath = path.join(tmpDir, 'batch.json');
    fs.writeFileSync(batchPath, JSON.stringify([
      { text: 'おはようございます' },
      { text: 'こんにちは' },       // this one will fail
      { text: 'おやすみなさい' },
    ]));

    const mockSynthesize = jest.fn()
      .mockResolvedValueOnce(Buffer.from('audio-1'))
      .mockRejectedValueOnce(new Error('Azure timeout'))
      .mockResolvedValueOnce(Buffer.from('audio-3'));

    const output: string[] = [];

    await expect(runCli({
      argv: ['node', 'ossharu', '--config', configPath, '--batch', batchPath],
      synthesizer: mockSynthesize,
      onOutput: (line) => output.push(line),
    })).rejects.toThrow('Azure timeout');

    expect(mockSynthesize).toHaveBeenCalledTimes(2);  // third entry never reached
    expect(output).toHaveLength(1);                   // only first entry reported
  });

  it('continues batch processing after a failure when --continue is passed', async () => {
    const configPath = path.join(tmpDir, 'ossharu.config.json');
    fs.writeFileSync(configPath, JSON.stringify({
      voice: 'ja-JP-NanamiNeural',
      speed: 1.0,
      outputDir: tmpDir,
      region: 'japaneast',
      apiKey: 'test-key',
    }));

    const batchPath = path.join(tmpDir, 'batch.json');
    fs.writeFileSync(batchPath, JSON.stringify([
      { text: 'おはようございます' },
      { text: 'こんにちは' },         // this one will fail
      { text: 'おやすみなさい' },
    ]));

    const mockSynthesize = jest.fn()
      .mockResolvedValueOnce(Buffer.from('audio-1'))
      .mockRejectedValueOnce(new Error('Azure timeout'))
      .mockResolvedValueOnce(Buffer.from('audio-3'));

    const output: string[] = [];

    await runCli({
      argv: ['node', 'ossharu', '--config', configPath, '--batch', batchPath, '--continue'],
      synthesizer: mockSynthesize,
      onOutput: (line) => output.push(line),
    });

    expect(mockSynthesize).toHaveBeenCalledTimes(3);
    expect(output).toHaveLength(3);
    expect(output[0]).toMatch(/おはようございます/);
    expect(output[1]).toMatch(/FAILED: こんにちは.*Azure timeout/);
    expect(output[2]).toMatch(/おやすみなさい/);
  });

  it('emits a JSON success object when --json is passed', async () => {
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
      argv: ['node', 'ossharu', '--config', configPath, '--json', 'こんにちは'],
      synthesizer: mockSynthesize,
      onOutput: (line) => output.push(line),
    });

    expect(output).toHaveLength(1);

    const parsed = JSON.parse(output[0]);
    expect(parsed).toEqual({
      status: 'ok',
      text: 'こんにちは',
      path: expect.stringMatching(/こんにちは.*\.mp3$/),
    });
  });

  it('emits a JSON failure object when --json is passed and synthesis fails', async () => {
    const configPath = path.join(tmpDir, 'ossharu.config.json');
    fs.writeFileSync(configPath, JSON.stringify({
      voice: 'ja-JP-NanamiNeural',
      speed: 1.0,
      outputDir: tmpDir,
      region: 'japaneast',
      apiKey: 'test-key',
    }));

    const failingSynthesize = jest.fn().mockRejectedValue(
      new Error('Azure timeout')
    );

    const output: string[] = [];

    await runCli({
      argv: ['node', 'ossharu', '--config', configPath, '--json', 'こんにちは'],
      synthesizer: failingSynthesize,
      onOutput: (line) => output.push(line),
    });

    expect(output).toHaveLength(1);

    const parsed = JSON.parse(output[0]);
    expect(parsed).toEqual({
      status: 'failed',
      text: 'こんにちは',
      error: 'Azure timeout',
    });
  });

  it('emits JSON objects for each batch entry when --json is passed', async () => {
    const configPath = path.join(tmpDir, 'ossharu.config.json');
    fs.writeFileSync(configPath, JSON.stringify({
      voice: 'ja-JP-NanamiNeural',
      speed: 1.0,
      outputDir: tmpDir,
      region: 'japaneast',
      apiKey: 'test-key',
    }));

    const batchPath = path.join(tmpDir, 'batch.json');
    fs.writeFileSync(batchPath, JSON.stringify([
      { text: 'おはようございます' },
      { text: 'こんにちは' },
      { text: 'おやすみなさい' },
    ]));

    const output: string[] = [];

    await runCli({
      argv: ['node', 'ossharu', '--config', configPath, '--batch', batchPath, '--json'],
      synthesizer: mockSynthesize,
      onOutput: (line) => output.push(line),
    });

    expect(output).toHaveLength(3);

    const parsed = output.map(line => JSON.parse(line));
    expect(parsed[0]).toEqual({ status: 'ok', text: 'おはようございます', path: expect.stringMatching(/おはようございます.*\.mp3$/) });
    expect(parsed[1]).toEqual({ status: 'ok', text: 'こんにちは', path: expect.stringMatching(/こんにちは.*\.mp3$/) });
    expect(parsed[2]).toEqual({ status: 'ok', text: 'おやすみなさい', path: expect.stringMatching(/おやすみなさい.*\.mp3$/) });
  });

  it('emits JSON failure objects for failed batch entries when --json is passed', async () => {
    const configPath = path.join(tmpDir, 'ossharu.config.json');
    fs.writeFileSync(configPath, JSON.stringify({
      voice: 'ja-JP-NanamiNeural',
      speed: 1.0,
      outputDir: tmpDir,
      region: 'japaneast',
      apiKey: 'test-key',
    }));

    const batchPath = path.join(tmpDir, 'batch.json');
    fs.writeFileSync(batchPath, JSON.stringify([
      { text: 'おはようございます' },
      { text: 'こんにちは' },
      { text: 'おやすみなさい' },
    ]));

    const failingSynthesize = jest.fn()
      .mockResolvedValueOnce(Buffer.from('audio-1'))
      .mockRejectedValueOnce(new Error('Azure timeout'))
      .mockResolvedValueOnce(Buffer.from('audio-3'));

    const output: string[] = [];

    await runCli({
      argv: ['node', 'ossharu', '--config', configPath, '--batch', batchPath, '--json'],
      synthesizer: failingSynthesize,
      onOutput: (line) => output.push(line),
    });

    expect(output).toHaveLength(3);

    const parsed = output.map(line => JSON.parse(line));
    expect(parsed[0]).toEqual({ status: 'ok', text: 'おはようございます', path: expect.stringMatching(/おはようございます.*\.mp3$/) });
    expect(parsed[1]).toEqual({ status: 'failed', text: 'こんにちは', error: 'Azure timeout' });
    expect(parsed[2]).toEqual({ status: 'ok', text: 'おやすみなさい', path: expect.stringMatching(/おやすみなさい.*\.mp3$/) });
  });

});