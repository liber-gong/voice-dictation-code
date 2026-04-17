import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { handleFinalText } from '../transcript'
import { _setTranscriptChannelForTest, appendTranscript } from '../logger'

function makeSinks() {
  const calls = { append: [] as string[], shown: 0, typed: [] as string[] }
  const sinks = {
    appendTranscript: (t: string) => calls.append.push(t),
    showTranscript: () => { calls.shown++ },
    type: (t: string) => calls.typed.push(t),
  }
  return { calls, sinks }
}

describe('handleFinalText', () => {
  it('forwards text to transcript, panel, and typer when active', () => {
    const { calls, sinks } = makeSinks()
    handleFinalText('hello world', false, sinks)
    assert.deepStrictEqual(calls.append, ['hello world'])
    assert.equal(calls.shown, 1)
    assert.deepStrictEqual(calls.typed, ['hello world'])
  })

  it('drops everything when aborted', () => {
    const { calls, sinks } = makeSinks()
    handleFinalText('hello', true, sinks)
    assert.deepStrictEqual(calls.append, [])
    assert.equal(calls.shown, 0)
    assert.deepStrictEqual(calls.typed, [])
  })

  it('still passes empty strings through (sinks decide what to do)', () => {
    const { calls, sinks } = makeSinks()
    handleFinalText('', false, sinks)
    assert.deepStrictEqual(calls.append, [''])
    assert.equal(calls.shown, 1)
    assert.deepStrictEqual(calls.typed, [''])
  })
})

describe('appendTranscript', () => {
  beforeEach(() => _setTranscriptChannelForTest(undefined))

  it('writes raw text without timestamp prefix', () => {
    const lines: string[] = []
    _setTranscriptChannelForTest({
      appendLine: (l: string) => lines.push(l),
      // unused members for the OutputChannel shape
      name: 'test', append: () => {}, replace: () => {}, clear: () => {},
      show: () => {}, hide: () => {}, dispose: () => {},
    } as unknown as Parameters<typeof _setTranscriptChannelForTest>[0])
    appendTranscript('hello')
    assert.deepStrictEqual(lines, ['hello'])
  })

  it('skips empty strings', () => {
    const lines: string[] = []
    _setTranscriptChannelForTest({
      appendLine: (l: string) => lines.push(l),
      name: 'test', append: () => {}, replace: () => {}, clear: () => {},
      show: () => {}, hide: () => {}, dispose: () => {},
    } as unknown as Parameters<typeof _setTranscriptChannelForTest>[0])
    appendTranscript('')
    assert.deepStrictEqual(lines, [])
  })

  it('no-ops when no channel is configured', () => {
    _setTranscriptChannelForTest(undefined)
    assert.doesNotThrow(() => appendTranscript('hi'))
  })
})
