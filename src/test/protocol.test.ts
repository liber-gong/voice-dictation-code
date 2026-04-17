import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { gzipSync } from 'node:zlib'
import {
  buildFrame,
  buildHeader,
  parseFrame,
  COMP_GZIP,
  FLAG_LAST_PACKET,
  MT_AUDIO_ONLY,
  SER_NONE,
} from '../asr/protocol'

describe('protocol', () => {
  it('round-trips a gzipped audio frame', () => {
    const audio = Buffer.from('the quick brown fox')
    const header = buildHeader(MT_AUDIO_ONLY, 0, SER_NONE, COMP_GZIP)
    const frame = buildFrame(header, gzipSync(audio))
    const parsed = parseFrame(frame)
    assert.equal(parsed.messageType, MT_AUDIO_ONLY)
    assert.equal(parsed.flags, 0)
    assert.deepStrictEqual(parsed.payload, audio)
  })

  it('preserves the last-packet flag', () => {
    const header = buildHeader(MT_AUDIO_ONLY, FLAG_LAST_PACKET, SER_NONE, COMP_GZIP)
    const frame = buildFrame(header, gzipSync(Buffer.alloc(0)))
    const parsed = parseFrame(frame)
    assert.equal(parsed.flags, FLAG_LAST_PACKET)
    assert.equal(parsed.payload.length, 0)
  })

  it('fills header bytes correctly', () => {
    const h = buildHeader(MT_AUDIO_ONLY, FLAG_LAST_PACKET, SER_NONE, COMP_GZIP)
    assert.equal(h[0], 0x11)
    assert.equal(h[1], (MT_AUDIO_ONLY << 4) | FLAG_LAST_PACKET)
    assert.equal(h[2], (SER_NONE << 4) | COMP_GZIP)
    assert.equal(h[3], 0)
  })
})
