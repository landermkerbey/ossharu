import * as fs from 'fs';
import * as path from 'path';

export interface SynthesizeOptions {
  text: string;
  voice: string;
  speed: number;
}

export type SynthesizerFn = (options: SynthesizeOptions) => Promise<Buffer>;

export interface SpeechOptions {
  text: string;
  voice: string;
  speed: number;
  outputDir: string;
  synthesizer: SynthesizerFn;
  force?: boolean;
}

const MAX_TEXT_IN_FILENAME = 30;

export async function synthesizeSpeech(options: SpeechOptions): Promise<string> {
  const { text, voice, speed, outputDir, synthesizer, force } = options;

  const slug = text.slice(0, MAX_TEXT_IN_FILENAME).replace(/[/\\?%*:|"<>]/g, '-');

  const existingFile = fs.readdirSync(outputDir)
    .find(f => f.startsWith(slug) && f.endsWith('.mp3'));

  if (existingFile && !force) {
    return path.join(outputDir, existingFile);
  }

  const audioData = await synthesizer({ text, voice, speed });

  const outputPath = existingFile
    ? path.join(outputDir, existingFile)
    : path.join(outputDir, `${slug}-${Date.now()}.mp3`);

  fs.writeFileSync(outputPath, audioData);

  return outputPath;
}
