export interface TtsConfig {
    voice: string;
    speed: number;
    outputDir: string;
    region: string;
    apiKey: string;
}
export interface XdgConfigFile {
    defaultProfile?: string;
    profiles: Record<string, TtsConfig>;
}
export interface LoadConfigOptions {
    configFile?: string;
    profile?: string;
    overrides?: Partial<TtsConfig>;
}
export declare function loadConfig(options?: LoadConfigOptions): TtsConfig;
//# sourceMappingURL=config.d.ts.map