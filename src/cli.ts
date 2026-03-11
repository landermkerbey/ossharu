import { Command } from 'commander';
import { loadConfig } from './config';
import { synthesizeSpeech, SynthesizerFn } from './tts';
import * as fs from 'fs';
import * as readline from 'readline';

export interface RunCliOptions {
  argv: string[];
  synthesizer: SynthesizerFn;
  onOutput: (line: string) => void;
  onPrompt?: (question: string, callback: (answer: string) => void) => void;
}

interface BatchEntry {
  text: string;
  voice?: string;
  speed?: number;
}

function defaultPrompt(
  question: string,
  callback: (answer: string) => void
): void {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question(question, (answer) => {
    rl.close();
    callback(answer);
  });
}

function promptAsync(
  onPrompt: (question: string, callback: (answer: string) => void) => void,
  question: string
): Promise<string> {
  return new Promise((resolve) => onPrompt(question, resolve));
}

async function runInteractive(
  config: ReturnType<typeof loadConfig>,
  synthesizer: SynthesizerFn,
  onOutput: (line: string) => void,
  onPrompt: (question: string, callback: (answer: string) => void) => void,
): Promise<void> {
  onOutput('Entering interactive mode. Press Enter on an empty line to exit.');

  while (true) {
    const text = await promptAsync(onPrompt, '> ');

    if (text.trim() === '') {
      onOutput('Exiting interactive mode.');
      break;
    }

    const outputPath = await synthesizeSpeech({
      text: text.trim(),
      voice: config.voice,
      speed: config.speed,
      outputDir: config.outputDir,
      synthesizer,
    });
    onOutput(`Generated: ${outputPath}`);
  }
}

export async function runCli(options: RunCliOptions): Promise<void> {
  const { argv, synthesizer, onOutput, onPrompt = defaultPrompt } = options;

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
    .option('--continue', 'continue batch processing after a failed entry')
    .option('--force', 'overwrite existing files instead of skipping them')
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
	  try {
	    const outputPath = await synthesizeSpeech({
	      text: entry.text,
	      voice: entry.voice ?? config.voice,
	      speed: entry.speed ?? config.speed,
	      outputDir: config.outputDir,
	      synthesizer,
	      force: opts.force,
	    });
	    onOutput(`Generated: ${outputPath}`);
	  } catch (err) {
	    if (opts.continue) {
	      onOutput(`FAILED: ${entry.text} — ${(err as Error).message}`);
	    } else {
	      throw err;
	    }
	  }
	}

      } else if (text) {
        const outputPath = await synthesizeSpeech({
          text,
          voice: config.voice,
          speed: config.speed,
          outputDir: config.outputDir,
          synthesizer,
	  force: opts.force,
        });
        onOutput(`Generated: ${outputPath}`);
      } else {
        await runInteractive(config, synthesizer, onOutput, onPrompt);
      }
    });

  await program.parseAsync(argv);
}