import * as vscode from 'vscode'
import { AsrClient } from './asr/client'
import { AsrProvider } from './asr/provider'
import { DictationConfig, DictationMode } from './config'
import { appendTranscript, log, showTranscript } from './logger'
import { MicCapture } from './mic'
import { StatusBar } from './statusBar'
import { handleFinalText } from './transcript'
import { Typer } from './typer'

export interface SessionDeps {
  config: DictationConfig;
  provider: AsrProvider;
  mode: DictationMode;
  python: string;
  micScript: string;
  typer: Typer;
  statusBar: StatusBar;
}

/**
 * One dictation cycle: mic → AsrClient → Typer, plus focus-loss auto-stop
 * in streaming mode. Owns the disposable wiring for a single session so the
 * extension entry point only sees start/stop/isActive.
 */
export class DictationSession {
  private client: AsrClient | undefined
  private mic: MicCapture | undefined
  private focusWatch: vscode.Disposable | undefined
  private aborted = false

  constructor(private readonly deps: SessionDeps) {}

  isActive(): boolean {
    return Boolean(this.client || this.mic)
  }

  async start(): Promise<void> {
    const { config, provider, mode, python, micScript, typer, statusBar } = this.deps
    const stream = mode === 'stream'

    typer.start()
    typer.reset()
    this.aborted = false

    if (stream) {
      this.focusWatch = vscode.window.onDidChangeWindowState((state) => {
        if (!state.focused && !this.aborted) {
          log('ext', 'window lost focus during streaming — auto stopping')
          this.aborted = true
          this.stop()
        }
      })
    }

    const client = new AsrClient(config, provider, {
      onPartial: (text) => {
        if (stream && !this.aborted) { typer.replace(text) }
      },
      onFinal: (text) => {
        handleFinalText(text, this.aborted, {
          appendTranscript,
          showTranscript,
          type: (t) => typer.replace(t),
        })
      },
      onError: (err) => {
        log('ext', 'asr error:', err)
        vscode.window.showErrorMessage(`Voice Dictation: ${err.message}`)
        this.stop()
      },
      onClose: () => {
        log('ext', 'asr closed')
        this.cleanup()
        statusBar.renderIdle()
      },
    })
    this.client = client

    try {
      await client.start()
    } catch (err) {
      vscode.window.showErrorMessage(`Voice Dictation: ${(err as Error).message}`)
      this.client = undefined
      return
    }

    const mic = new MicCapture(python, micScript, {
      onChunk: (chunk) => client.sendAudio(chunk, false),
      onError: (err) => {
        vscode.window.showErrorMessage(`Voice Dictation mic: ${err.message}`)
        this.stop()
      },
      onExit: () => {
        // Python mic ended — flush the last-frame flag so the server returns final.
        client.sendAudio(Buffer.alloc(0), true)
      },
    })
    this.mic = mic
    mic.start()

    statusBar.renderRecording(mode)
  }

  stop(): void {
    this.mic?.stop()
    this.deps.statusBar.renderProcessing()
    // Final cleanup runs via client.onClose after the server sends the final frame.
  }

  dispose(): void {
    this.mic?.stop()
    this.client?.stop()
    this.cleanup()
  }

  private cleanup(): void {
    this.focusWatch?.dispose()
    this.focusWatch = undefined
    this.client = undefined
    this.mic?.stop()
    this.mic = undefined
  }
}
