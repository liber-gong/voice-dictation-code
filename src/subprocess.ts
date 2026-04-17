import { ChildProcessWithoutNullStreams, spawn } from 'node:child_process'
import { log } from './logger'

const STOP_GRACE_MS = 500

/**
 * Shared lifecycle for long-lived Python helper processes (mic, typer).
 * Both expect a 'q\n' line on stdin to shut down cleanly; kill is a safety net.
 * Subclasses attach their own stdout / stdin handlers after calling `spawnProc`.
 */
export class PythonProcess {
  protected proc: ChildProcessWithoutNullStreams | undefined

  constructor(
    private readonly pythonPath: string,
    private readonly scriptPath: string,
    private readonly tag: string,
  ) {}

  protected spawnProc(onExit?: (code: number | null) => void): ChildProcessWithoutNullStreams {
    const proc = spawn(this.pythonPath, ['-u', this.scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    this.proc = proc
    proc.stderr.on('data', (d: Buffer) => log(this.tag, d.toString().trimEnd()))
    proc.on('exit', (code) => {
      log(this.tag, `exit ${code}`)
      this.proc = undefined
      onExit?.(code)
    })
    return proc
  }

  protected writeLine(line: string): void {
    try { this.proc?.stdin.write(line + '\n') } catch { /* ignore */ }
  }

  stop(): void {
    if (!this.proc) { return }
    this.writeLine('q')
    const p = this.proc
    setTimeout(() => { if (!p.killed) p.kill() }, STOP_GRACE_MS)
  }
}
