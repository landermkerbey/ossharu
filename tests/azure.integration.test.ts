import { createAzureSynthesizer } from '../src/azure';

const RUN_INTEGRATION = process.env.OSSHARU_INTEGRATION === '1';

(RUN_INTEGRATION ? describe : describe.skip)('Azure TTS integration', () => {
  it('synthesizes audio from a known Japanese voice and returns a non-empty buffer', async () => {
    const region = process.env.AZURE_REGION;
    const apiKey = process.env.AZURE_API_KEY;

    if (!region || !apiKey) {
      throw new Error(
        'AZURE_REGION and AZURE_API_KEY must be set to run integration tests.'
      );
    }

    const synthesizer = createAzureSynthesizer(region, apiKey);

    const buffer = await synthesizer({
      text: 'こんにちは',
      voice: 'ja-JP-NanamiNeural',
      speed: 1.0,
    });

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.byteLength).toBeGreaterThan(0);
  }, 15000); // generous timeout for a real network call
});