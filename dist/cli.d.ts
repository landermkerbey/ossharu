import { SynthesizerFn } from './tts';
export interface RunCliOptions {
    argv: string[];
    synthesizer: SynthesizerFn;
    onOutput: (line: string) => void;
    onPrompt?: (question: string, callback: (answer: string) => void) => void;
}
export declare function runCli(options: RunCliOptions): Promise<void>;
//# sourceMappingURL=cli.d.ts.map