import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import { SynthesizeOptions, SynthesizerFn } from './tts';

export function createAzureSynthesizer(region: string, apiKey: string): SynthesizerFn {
  return ({ text, voice, speed }: SynthesizeOptions): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
      const speechConfig = sdk.SpeechConfig.fromSubscription(apiKey, region);
      speechConfig.speechSynthesisVoiceName = voice;
      speechConfig.speechSynthesisOutputFormat =
        sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;

      const ssml = buildSsml(text, voice, speed);

      const synthesizer = new sdk.SpeechSynthesizer(speechConfig);

      synthesizer.speakSsmlAsync(
        ssml,
        (result) => {
          synthesizer.close();
          if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
            resolve(Buffer.from(result.audioData));
          } else {
            reject(new Error(
              `Synthesis failed: ${sdk.ResultReason[result.reason]}. ` +
              `Details: ${result.errorDetails}`
            ));
          }
        },
        (error) => {
          synthesizer.close();
          reject(new Error(`Synthesis error: ${error}`));
        }
      );
    });
  };
}

function buildSsml(text: string, voice: string, speed: number): string {
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

function speedToSsmlRate(speed: number): string {
  if (speed === 1.0) return 'medium';
  if (speed < 1.0) return `${Math.round(speed * 100)}%`;
  return `${Math.round(speed * 100)}%`;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}