import { synthesizeSpeech } from '../src/tts';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('synthesizeSpeech', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ossharu-tts-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('writes an audio file to the output directory', async () => {
    const mockSynthesize = jest.fn().mockResolvedValue(Buffer.from('fake-audio-data'));

    const outputPath = await synthesizeSpeech({
      text: 'こんにちは',
      voice: 'ja-JP-NanamiNeural',
      speed: 1.0,
      outputDir: tmpDir,
      synthesizer: mockSynthesize,
    });

    expect(mockSynthesize).toHaveBeenCalledWith({
      text: 'こんにちは',
      voice: 'ja-JP-NanamiNeural',
      speed: 1.0,
    });
    expect(fs.existsSync(outputPath)).toBe(true);
    expect(fs.readFileSync(outputPath)).toEqual(Buffer.from('fake-audio-data'));
    expect(outputPath).toMatch(/\.mp3$/);
  });

  it('generates a filename derived from the source text', async () => {
    const mockSynthesize = jest.fn().mockResolvedValue(Buffer.from('fake-audio-data'));

    const outputPath = await synthesizeSpeech({
      text: 'こんにちは世界',
      voice: 'ja-JP-NanamiNeural',
      speed: 1.0,
      outputDir: tmpDir,
      synthesizer: mockSynthesize,
    });

    const filename = path.basename(outputPath, '.mp3');
    expect(filename).toMatch(/^こんにちは世界/);
  });

  it('rejects if the synthesizer throws', async () => {
    const mockSynthesize = jest.fn().mockRejectedValue(
      new Error('Azure API error: invalid API key')
    );

    await expect(synthesizeSpeech({
      text: 'こんにちは',
      voice: 'ja-JP-NanamiNeural',
      speed: 1.0,
      outputDir: tmpDir,
      synthesizer: mockSynthesize,
    })).rejects.toThrow('Azure API error: invalid API key');

    const files = fs.readdirSync(tmpDir);
    expect(files).toHaveLength(0);
  });

  it('skips synthesis if an output file for the same text already exists', async () => {
    const mockSynthesize = jest.fn().mockResolvedValue(Buffer.from('fake-audio-data'));

    // First call — should synthesize and write
    const firstPath = await synthesizeSpeech({
      text: 'こんにちは',
      voice: 'ja-JP-NanamiNeural',
      speed: 1.0,
      outputDir: tmpDir,
      synthesizer: mockSynthesize,
    });

    expect(mockSynthesize).toHaveBeenCalledTimes(1);
    expect(fs.existsSync(firstPath)).toBe(true);

    // Second call with identical text — should skip synthesis entirely
    const secondPath = await synthesizeSpeech({
      text: 'こんにちは',
      voice: 'ja-JP-NanamiNeural',
      speed: 1.0,
      outputDir: tmpDir,
      synthesizer: mockSynthesize,
    });

    expect(mockSynthesize).toHaveBeenCalledTimes(1); // not called again
    expect(secondPath).toBe(firstPath);              // same path returned
  });

  it('does not use a cached file whose slug is a prefix of a longer phrase', async () => {
    // Simulate a pre-existing sentence audio file whose filename slug starts
    // with the target word (e.g. a sentence beginning with 「市場」 cached
    // before the standalone word was studied).
    const sentenceSlug = '市場の動向が不安定なので、しばらく様子見'; // 18 chars — starts with 市場
    const sentenceFile = `${sentenceSlug}-1700000000000.mp3`;
    fs.writeFileSync(path.join(tmpDir, sentenceFile), Buffer.from('sentence-audio'));

    const mockSynthesize = jest.fn().mockResolvedValue(Buffer.from('word-audio'));

    const outputPath = await synthesizeSpeech({
      text: '市場',
      voice: 'ja-JP-NanamiNeural',
      speed: 1.0,
      outputDir: tmpDir,
      synthesizer: mockSynthesize,
    });

    // Must have synthesized fresh audio, not returned the sentence file
    expect(mockSynthesize).toHaveBeenCalledTimes(1);
    expect(path.basename(outputPath)).not.toBe(sentenceFile);
    expect(fs.readFileSync(outputPath)).toEqual(Buffer.from('word-audio'));
  });

  it('re-synthesizes and overwrites an existing file when force is true', async () => {
    const mockSynthesize = jest.fn()
      .mockResolvedValueOnce(Buffer.from('original-audio'))
      .mockResolvedValueOnce(Buffer.from('new-audio'));

    // First call — writes the file
    const firstPath = await synthesizeSpeech({
      text: 'こんにちは',
      voice: 'ja-JP-NanamiNeural',
      speed: 1.0,
      outputDir: tmpDir,
      synthesizer: mockSynthesize,
    });

    expect(fs.readFileSync(firstPath)).toEqual(Buffer.from('original-audio'));

    // Second call with force — should re-synthesize and overwrite
    const secondPath = await synthesizeSpeech({
      text: 'こんにちは',
      voice: 'ja-JP-NanamiNeural',
      speed: 1.0,
      outputDir: tmpDir,
      synthesizer: mockSynthesize,
      force: true,
    });

    expect(mockSynthesize).toHaveBeenCalledTimes(2);
    expect(secondPath).toBe(firstPath);
    expect(fs.readFileSync(secondPath)).toEqual(Buffer.from('new-audio'));
  });

});