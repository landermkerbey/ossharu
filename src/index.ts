#!/usr/bin/env node
import { runCli } from './cli';
import { createAzureSynthesizer } from './azure';
import { loadConfig } from './config';

async function main(): Promise<void> {
  // We need to peek at --config and flag overrides before commander parses
  // argv, so we can build the synthesizer with the correct region and apiKey.
  const argvConfigIndex = process.argv.indexOf('--config');
  const configFile = argvConfigIndex !== -1
    ? process.argv[argvConfigIndex + 1]
    : undefined;

  const flagOverrides = parseEarlyFlags(process.argv);

  const config = loadConfig({ configFile, overrides: flagOverrides });
  const synthesizer = createAzureSynthesizer(config.region, config.apiKey);

  await runCli({
    argv: process.argv,
    synthesizer,
    onOutput: (line) => console.log(line),
  });
}

function parseEarlyFlags(argv: string[]): Partial<{
  region: string;
  apiKey: string;
}> {
  const overrides: Partial<{ region: string; apiKey: string }> = {};

  const regionIndex = argv.indexOf('--region');
  if (regionIndex !== -1 && argv[regionIndex + 1]) {
    overrides.region = argv[regionIndex + 1];
  }

  const apiKeyIndex = argv.indexOf('--api-key');
  if (apiKeyIndex !== -1 && argv[apiKeyIndex + 1]) {
    overrides.apiKey = argv[apiKeyIndex + 1];
  }

  return overrides;
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});