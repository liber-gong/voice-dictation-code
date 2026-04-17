import { randomUUID } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import WebSocket from 'ws'
import { DictationConfig } from '../config'
import { log } from '../logger'
import {
  buildFrame,
  buildHeader,
  parseFrame,
  COMP_GZIP,
  FLAG_LAST_PACKET,
  MT_AUDIO_ONLY,
  MT_FULL_CLIENT,
  MT_FULL_SERVER,
  MT_SERVER_ERROR,
  SER_JSON,
  SER_NONE,
} from './protocol'
import { AsrProvider } from './provider'

export interface AsrEvents {
  onPartial: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (err: Error) => void;
  onClose: () => void;
}

const CONNECT_RETRY_DELAY_MS = 300

/**
 * Streaming ASR client. Wraps the WebSocket + wire-protocol plumbing.
 * Audio in: raw PCM s16le mono 16 kHz chunks.
 */
export class AsrClient {
  private ws: WebSocket | undefined
  private closed = false

  constructor(
    private readonly config: DictationConfig,
    private readonly provider: AsrProvider,
    private readonly events: AsrEvents,
  ) {}

  async start(): Promise<void> {
    try {
      await this.connect()
    } catch (err) {
      log('asr', 'connect failed, retrying once:', err)
      await new Promise((r) => setTimeout(r, CONNECT_RETRY_DELAY_MS))
      await this.connect()
    }
  }

  sendAudio(chunk: Buffer, isLast: boolean): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) { return }
    const payload = gzipSync(chunk)
    const flags = isLast ? FLAG_LAST_PACKET : 0
    const frame = buildFrame(buildHeader(MT_AUDIO_ONLY, flags, SER_NONE, COMP_GZIP), payload)
    this.ws.send(frame)
  }

  stop(): void {
    if (this.closed) { return }
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendAudio(Buffer.alloc(0), true)
    } else {
      this.ws?.close()
    }
  }

  private async connect(): Promise<void> {
    const url = this.config.endpoint || this.provider.defaultEndpoint
    const headers = this.provider.buildAuthHeaders(this.config, randomUUID())

    const ws = new WebSocket(url, { headers })
    this.ws = ws

    await new Promise<void>((resolve, reject) => {
      const onOpen = () => { ws.off('error', onError); resolve() }
      const onError = (err: Error) => { ws.off('open', onOpen); reject(err) }
      ws.once('open', onOpen)
      ws.once('error', onError)
    })

    ws.on('message', (data: Buffer) => this.handleMessage(data))
    ws.on('error', (err: Error) => { log('asr', 'ws error:', err); this.events.onError(err) })
    ws.on('close', () => { this.closed = true; this.ws = undefined; this.events.onClose() })

    this.sendInit()
  }

  private sendInit(): void {
    if (!this.ws) { return }
    const payload = gzipSync(Buffer.from(JSON.stringify(this.provider.buildInitPayload())))
    const frame = buildFrame(buildHeader(MT_FULL_CLIENT, 0, SER_JSON, COMP_GZIP), payload)
    this.ws.send(frame)
  }

  private handleMessage(data: Buffer): void {
    let frame
    try {
      frame = parseFrame(data)
    } catch (e) {
      this.events.onError(e as Error)
      return
    }
    const { messageType, flags, payload } = frame
    if (messageType === MT_FULL_SERVER) {
      const raw = payload.toString('utf-8')
      let json: unknown
      try {
        json = JSON.parse(raw)
      } catch {
        log('asr', 'non-json server frame:', raw.slice(0, 120))
        return
      }
      const text = this.provider.extractText(json)
      const isFinal = Boolean(flags & FLAG_LAST_PACKET)
      if (isFinal) {
        if (text) { this.events.onFinal(text) }
        this.ws?.close()
      } else if (text) {
        this.events.onPartial(text)
      }
    } else if (messageType === MT_SERVER_ERROR) {
      this.events.onError(new Error(payload.toString('utf-8')))
      this.ws?.close()
    }
  }
}
