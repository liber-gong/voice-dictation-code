import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { DictationConfig } from '../config'
import { bytedanceProvider, DEFAULT_MODEL, SAMPLE_RATE } from '../asr/bytedance'

const baseConfig: DictationConfig = {
  apiKey: '',
  appId: '',
  accessToken: '',
  model: '',
  endpoint: '',
  pythonPath: 'python3',
}

describe('bytedance buildAuthHeaders', () => {
  it('falls back to default model and always sets connect id', () => {
    const h = bytedanceProvider.buildAuthHeaders(baseConfig, 'c-1')
    assert.equal(h['X-Api-Resource-Id'], DEFAULT_MODEL)
    assert.equal(h['X-Api-Connect-Id'], 'c-1')
  })

  it('uses configured model when set', () => {
    const h = bytedanceProvider.buildAuthHeaders({ ...baseConfig, model: 'custom-model' }, 'c-2')
    assert.equal(h['X-Api-Resource-Id'], 'custom-model')
  })

  it('emits api-key header only when set', () => {
    const empty = bytedanceProvider.buildAuthHeaders(baseConfig, 'c-3')
    assert.equal(empty['X-Api-Key'], undefined)

    const filled = bytedanceProvider.buildAuthHeaders({ ...baseConfig, apiKey: 'k' }, 'c-3')
    assert.equal(filled['X-Api-Key'], 'k')
  })

  it('emits legacy app-id / access-key headers independently', () => {
    const h = bytedanceProvider.buildAuthHeaders({ ...baseConfig, appId: 'a', accessToken: 't' }, 'c-4')
    assert.equal(h['X-Api-App-Key'], 'a')
    assert.equal(h['X-Api-Access-Key'], 't')
    assert.equal(h['X-Api-Key'], undefined)
  })
})

describe('bytedance buildInitPayload', () => {
  it('declares the agreed audio format and key request flags', () => {
    const p = bytedanceProvider.buildInitPayload() as {
      audio: { format: string; codec: string; rate: number; bits: number; channel: number };
      request: Record<string, unknown>;
    }
    assert.deepStrictEqual(p.audio, { format: 'pcm', codec: 'raw', rate: SAMPLE_RATE, bits: 16, channel: 1 })
    assert.equal(p.request.enable_itn, true)
    assert.equal(p.request.enable_punc, true)
    assert.equal(p.request.enable_ddc, false)
    assert.equal(p.request.end_window_size, 1500)
    assert.equal(p.request.enable_nonstream, true)
    assert.equal(p.request.show_utterances, true)
    assert.equal(p.request.result_type, 'full')
  })
})

describe('bytedance extractText', () => {
  it('returns result.text when present', () => {
    assert.equal(bytedanceProvider.extractText({ result: { text: 'hello' } }), 'hello')
  })

  it('returns undefined for empty / malformed payloads', () => {
    assert.equal(bytedanceProvider.extractText(null), undefined)
    assert.equal(bytedanceProvider.extractText({}), undefined)
    assert.equal(bytedanceProvider.extractText({ result: {} }), undefined)
    assert.equal(bytedanceProvider.extractText('not-an-object'), undefined)
  })
})
