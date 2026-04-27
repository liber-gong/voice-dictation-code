import { DictationConfig } from '../config'
import { AsrProvider } from './provider'

const DEFAULT_ENDPOINT = 'wss://openspeech.bytedance.com/api/v3/sauc/bigmodel_async'
const DEFAULT_MODEL = 'volc.seedasr.sauc.duration'
export const SAMPLE_RATE = 16000

export const bytedanceProvider: AsrProvider = {
  defaultEndpoint: DEFAULT_ENDPOINT,

  buildAuthHeaders(config: DictationConfig, connectId: string): Record<string, string> {
    const headers: Record<string, string> = {
      'X-Api-Resource-Id': config.model || DEFAULT_MODEL,
      'X-Api-Connect-Id': connectId,
    }
    if (config.apiKey) { headers['X-Api-Key'] = config.apiKey }
    if (config.appId) { headers['X-Api-App-Key'] = config.appId }
    if (config.accessToken) { headers['X-Api-Access-Key'] = config.accessToken }
    return headers
  },

  buildInitPayload(): object {
    return {
      user: { uid: 'voice-dictation-code' },
      audio: { format: 'pcm', codec: 'raw', rate: SAMPLE_RATE, bits: 16, channel: 1 },
      request: {
        model_name: 'bigmodel',
        enable_itn: true,
        enable_punc: false,
        enable_ddc: true,
        enable_nonstream: true,
        show_utterances: true,
        result_type: 'full',
      },
    }
  },

  extractText(json: unknown): string | undefined {
    const r = json as { result?: { text?: string } } | null | undefined
    return r?.result?.text
  },
}

export { DEFAULT_MODEL }
