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
export declare function synthesizeSpeech(options: SpeechOptions): Promise<string>;
//# sourceMappingURL=tts.d.ts.map