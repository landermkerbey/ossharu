#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cli_1 = require("./cli");
const azure_1 = require("./azure");
const config_1 = require("./config");
async function main() {
    // We need to peek at --config and flag overrides before commander parses
    // argv, so we can build the synthesizer with the correct region and apiKey.
    const argvConfigIndex = process.argv.indexOf('--config');
    const configFile = argvConfigIndex !== -1
        ? process.argv[argvConfigIndex + 1]
        : undefined;
    const flagOverrides = parseEarlyFlags(process.argv);
    const config = (0, config_1.loadConfig)({
        ...(configFile !== undefined ? { configFile } : {}),
        overrides: flagOverrides,
    });
    const synthesizer = (0, azure_1.createAzureSynthesizer)(config.region, config.apiKey);
    await (0, cli_1.runCli)({
        argv: process.argv,
        synthesizer,
        onOutput: (line) => console.log(line),
    });
}
function parseEarlyFlags(argv) {
    const overrides = {};
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
    console.error(`Error: ${err.message}`);
    process.exit(1);
});
//# sourceMappingURL=index.js.map