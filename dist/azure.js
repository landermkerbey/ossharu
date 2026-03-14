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
exports.createAzureSynthesizer = createAzureSynthesizer;
const sdk = __importStar(require("microsoft-cognitiveservices-speech-sdk"));
function createAzureSynthesizer(region, apiKey) {
    return ({ text, voice, speed }) => {
        return new Promise((resolve, reject) => {
            const speechConfig = sdk.SpeechConfig.fromSubscription(apiKey, region);
            speechConfig.speechSynthesisVoiceName = voice;
            speechConfig.speechSynthesisOutputFormat =
                sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;
            const ssml = buildSsml(text, voice, speed);
            const synthesizer = new sdk.SpeechSynthesizer(speechConfig);
            synthesizer.speakSsmlAsync(ssml, (result) => {
                synthesizer.close();
                if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
                    resolve(Buffer.from(result.audioData));
                }
                else {
                    reject(new Error(`Synthesis failed: ${sdk.ResultReason[result.reason]}. ` +
                        `Details: ${result.errorDetails}`));
                }
            }, (error) => {
                synthesizer.close();
                reject(new Error(`Synthesis error: ${error}`));
            });
        });
    };
}
function buildSsml(text, voice, speed) {
    const rate = speedToSsmlRate(speed);
    return [
        `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="ja-JP">`,
        `  <voice name="${voice}">`,
        `    <prosody rate="${rate}">`,
        `      ${escapeXml(text)}`,
        `    </prosody>`,
        `  </voice>`,
        `</speak>`,
    ].join('\n');
}
function speedToSsmlRate(speed) {
    if (speed === 1.0)
        return 'medium';
    if (speed < 1.0)
        return `${Math.round(speed * 100)}%`;
    return `${Math.round(speed * 100)}%`;
}
function escapeXml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
//# sourceMappingURL=azure.js.map