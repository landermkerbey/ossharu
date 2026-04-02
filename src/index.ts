#!/usr/bin/env node
import { runCli } from './cli';
import { createAzureSynthesizer } from './azure';
import { loadConfig } from './config';

async function main(): Promise<void> {
  // We need to peek at --config/--profile and flag overrides before commander
  // parses argv, so we can build the synthesizer with the correct region and
  // apiKey.
  const argvConfigIndex = process.argv.indexOf('--config');
  const configFile = argvConfigIndex !== -1
    ? process.argv[argvConfigIndex + 1]
    : undefined;

  const argvProfileIndex = process.argv.indexOf('--profile');
  const profile = argvProfileIndex !== -1
    ? process.argv[argvProfileIndex + 1]
    : undefined;

  const flagOverrides = parseEarlyFlags(process.argv);

  const config = loadConfig({
    ...(configFile !== undefined ? { configFile } : {}),
    ...(profile !== undefined ? { profile } : {}),
    overrides: flagOverrides,
  });
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
  const regionValue = argv[regionIndex + 1];
  if (regionIndex !== -1 && regionValue) {
    overrides.region = regionValue;
  }

  const apiKeyIndex = argv.indexOf('--api-key');
  const apiKeyValue = argv[apiKeyIndex + 1];
  if (apiKeyIndex !== -1 && apiKeyValue) {
    overrides.apiKey = apiKeyValue;
  }

  return overrides;
}

main().catch((err) => {
  // Commander throws these error codes after already printing the relevant
  // output (help text, version string); exit cleanly without a spurious
  // error message.
  if (err.code === 'commander.helpDisplayed' || err.code === 'commander.version') {
    process.exit(0);
  }
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
