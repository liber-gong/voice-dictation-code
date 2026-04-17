import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { AsrClient } from '../asr/client'
import { bytedanceProvider } from '../asr/bytedance'
import type { DictationConfig } from '../config'

const baseConfig: DictationConfig = {
  apiKey: '',
  appId: '',
  accessToken: '',
  model: '',
  endpoint: '',
  pythonPath: 'python3',
}

describe('AsrClient', () => {
  it('constructs without throwing', () => {
    const events = { onPartial: () => {}, onFinal: () => {}, onError: () => {}, onClose: () => {} }
    const client = new AsrClient(baseConfig, bytedanceProvider, events)
    assert.ok(client)
  })
})
