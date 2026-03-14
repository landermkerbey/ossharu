"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCli = runCli;
const commander_1 = require("commander");
const config_1 = require("./config");
const tts_1 = require("./tts");
const fs = __importStar(require("fs"));
const readline = __importStar(require("readline"));
function defaultPrompt(question, callback) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.question(question, (answer) => {
        rl.close();
        callback(answer);
    });
}
function promptAsync(onPrompt, question) {
    return new Promise((resolve) => onPrompt(question, resolve));
}
async function runInteractive(config, synthesizer, onOutput, onPrompt) {
    onOutput('Entering interactive mode. Press Enter on an empty line to exit.');
    while (true) {
        const text = await promptAsync(onPrompt, '> ');
        if (text.trim() === '') {
            onOutput('Exiting interactive mode.');
            break;
        }
        const outputPath = await (0, tts_1.synthesizeSpeech)({
            text: text.trim(),
            voice: config.voice,
            speed: config.speed,
            outputDir: config.outputDir,
            synthesizer,
        });
        onOutput(`Generated: ${outputPath}`);
    }
}
async function runCli(options) {
    const { argv, synthesizer, onOutput, onPrompt = defaultPrompt } = options;
    const program = new commander_1.Command();
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
        .option('--json', 'emit machine-readable JSON objects instead of human-readable lines')
        .argument('[text]', 'text to synthesize')
        .action(async (text, opts) => {
        const config = (0, config_1.loadConfig)({
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
            const entries = JSON.parse(raw);
            for (const entry of entries) {
                try {
                    const outputPath = await (0, tts_1.synthesizeSpeech)({
                        text: entry.text,
                        voice: entry.voice ?? config.voice,
                        speed: entry.speed ?? config.speed,
                        outputDir: config.outputDir,
                        synthesizer,
                        force: opts.force,
                    });
                    if (opts.json) {
                        onOutput(JSON.stringify({ status: 'ok', text: entry.text, path: outputPath }));
                    }
                    else {
                        onOutput(`Generated: ${outputPath}`);
                    }
                }
                catch (err) {
                    if (opts.json) {
                        onOutput(JSON.stringify({ status: 'failed', text: entry.text, error: err.message }));
                    }
                    else if (opts.continue) {
                        onOutput(`FAILED: ${entry.text} — ${err.message}`);
                    }
                    else {
                        throw err;
                    }
                }
            }
        }
        else if (text) {
            try {
                const outputPath = await (0, tts_1.synthesizeSpeech)({
                    text,
                    voice: config.voice,
                    speed: config.speed,
                    outputDir: config.outputDir,
                    synthesizer,
                    force: opts.force,
                });
                if (opts.json) {
                    onOutput(JSON.stringify({ status: 'ok', text, path: outputPath }));
                }
                else {
                    onOutput(`Generated: ${outputPath}`);
                }
            }
            catch (err) {
                if (opts.json) {
                    onOutput(JSON.stringify({ status: 'failed', text, error: err.message }));
                }
                else {
                    throw err;
                }
            }
        }
        else {
            await runInteractive(config, synthesizer, onOutput, onPrompt);
        }
    });
    await program.parseAsync(argv);
}
//# sourceMappingURL=cli.js.map