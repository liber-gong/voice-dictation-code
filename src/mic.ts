import { PythonProcess } from './subprocess'

export interface MicCaptureEvents {
  onChunk: (chunk: Buffer) => void;
  onError: (err: Error) => void;
  onExit: () => void;
}

/**
 * Spawns python/mic.py which reads the default mic via sounddevice and
 * pipes raw 16 kHz mono Int16 PCM bytes to stdout. Chunks are forwarded
 * to the caller unchanged.
 */
export class MicCapture extends PythonProcess {
  constructor(pythonPath: string, scriptPath: string, private readonly events: MicCaptureEvents) {
    super(pythonPath, scriptPath, 'mic')
  }

  start(): void {
    const proc = this.spawnProc(() => this.events.onExit())
    proc.stdout.on('data', (data: Buffer) => this.events.onChunk(data))
    proc.on('error', (err) => this.events.onError(err))
  }
}
