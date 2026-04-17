import type * as vscode from 'vscode'

let channel: vscode.OutputChannel | undefined
let transcriptChannel: vscode.OutputChannel | undefined

export function initLogger(): vscode.OutputChannel {
  if (!channel) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const vs = require('vscode') as typeof vscode
    channel = vs.window.createOutputChannel('Voice Dictation')
  }
  return channel
}

export function initTranscript(): vscode.OutputChannel {
  if (!transcriptChannel) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const vs = require('vscode') as typeof vscode
    transcriptChannel = vs.window.createOutputChannel('Voice Dictation Transcript')
  }
  return transcriptChannel
}

/** For tests: inject a channel-like object (or `undefined` to reset). */
export function _setTranscriptChannelForTest(ch: vscode.OutputChannel | undefined): void {
  transcriptChannel = ch
}

export function appendTranscript(text: string): void {
  if (!text) { return }
  transcriptChannel?.appendLine(text)
}

export function showTranscript(): void {
  transcriptChannel?.show(true)
}

export function showLog(): void {
  channel?.show(true)
}

export function log(tag: string, ...args: unknown[]): void {
  const msg = args
    .map(a => (typeof a === 'string' ? a : a instanceof Error ? `${a.message}\n${a.stack}` : JSON.stringify(a)))
    .join(' ')
  const line = `[${tag}] ${msg}`

  console.log(line)
  channel?.appendLine(`${new Date().toISOString()} ${line}`)
}
