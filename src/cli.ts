import { Command } from 'commander';
import { loadConfig } from './config';
import { synthesizeSpeech, SynthesizerFn } from './tts';
import * as fs from 'fs';

export interface RunCliOptions {
  argv: string[];
  synthesizer: SynthesizerFn;
  onOutput: (line: string) => void;
}

interface BatchEntry {
  text: string;
  voice?: string;
  speed?: number;
}

export async function runCli(options: RunCliOptions): Promise<void> {
  const { argv, synthesizer, onOutput } = options;

  const program = new Command();

  program
    .name('ossharu')
    .description('Generate language-study audio segments via Azure TTS')
    .option('--config <path>', 'path to config file')
    .option('--voice <voice>', 'voice name')
    .option('--speed <number>', 'speech speed', parseFloat)
    .option('--output-dir <path>', 'output directory')
    .option('--region <region>', 'Azure region')
    .option('--api-key <key>', 'Azure API key')
    .option('--batch <path>', 'path to batch JSON file')
    .argument('[text]', 'text to synthesize')
    .action(async (text: string | undefined, opts) => {
      const config = loadConfig({
        configFile: opts.config,
        overrides: {
          ...(opts.voice && { voice: opts.voice }),
          ...(opts.speed && { speed: opts.speed }),
          ...(opts.outputDir && { outputDir: opts.outputDir }),
          ...(opts.region && { region: opts.region }),
          ...(opts.apiKey && { apiKey: opts.apiKey }),
        },
      });

      if (!fs.existsSync(config.outputDir)) {
        fs.mkdirSync(config.outputDir, { recursive: true });
      }

      if (opts.batch) {
        const raw = fs.readFileSync(opts.batch, 'utf-8');
        const entries: BatchEntry[] = JSON.parse(raw);

        for (const entry of entries) {
          const outputPath = await synthesizeSpeech({
            text: entry.text,
            voice: entry.voice ?? config.voice,
            speed: entry.speed ?? config.speed,
            outputDir: config.outputDir,
            synthesizer,
          });
          onOutput(`Generated: ${outputPath}`);
        }
      } else if (text) {
        const outputPath = await synthesizeSpeech({
          text,
          voice: config.voice,
          speed: config.speed,
          outputDir: config.outputDir,
          synthesizer,
        });
        onOutput(`Generated: ${outputPath}`);
      }
    });

  await program.parseAsync(argv);
}