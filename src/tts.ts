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
}

export async function synthesizeSpeech(options: SpeechOptions): Promise<string> {
  const { text, voice, speed, outputDir, synthesizer } = options;

  const audioData = await synthesizer({ text, voice, speed });

  const timestamp = Date.now();
  const filename = `${timestamp}.mp3`;
  const outputPath = path.join(outputDir, filename);

  fs.writeFileSync(outputPath, audioData);

  return outputPath;
}