import { log } from './logger'
import { PythonProcess } from './subprocess'

export type TyperCommand =
  | { op: 'backspace'; n: number }
  | { op: 'type'; text: string }

/**
 * Compute the minimum edit to turn `prev` into `next`: backspace the diverging
 * suffix of `prev`, then type the diverging suffix of `next`. Either step is
 * skipped when its count is zero.
 */
export function diffReplace(prev: string, next: string): TyperCommand[] {
  const prefix = commonPrefixLen(prev, next)
  const toDelete = prev.length - prefix
  const toType = next.slice(prefix)
  const cmds: TyperCommand[] = []
  if (toDelete > 0) { cmds.push({ op: 'backspace', n: toDelete }) }
  if (toType) { cmds.push({ op: 'type', text: toType }) }
  return cmds
}

export function commonPrefixLen(a: string, b: string): number {
  const n = Math.min(a.length, b.length)
  for (let i = 0; i < n; i++) { if (a[i] !== b[i]) { return i } }
  return n
}

/**
 * Long-lived helper that drives system-level keystrokes via python/typer.py.
 * Tracks the last written text so incremental updates only backspace / retype
 * the differing suffix.
 */
export class Typer extends PythonProcess {
  private lastText = ''

  constructor(pythonPath: string, scriptPath: string) {
    super(pythonPath, scriptPath, 'typer')
  }

  start(): void {
    if (this.proc) { return }
    const proc = this.spawnProc(() => { this.lastText = '' })
    proc.on('error', (err) => log('typer', 'spawn error:', err))
  }

  reset(): void {
    this.lastText = ''
  }

  replace(nextText: string): void {
    if (!this.proc) { return }
    for (const cmd of diffReplace(this.lastText, nextText)) {
      this.writeLine(JSON.stringify(cmd))
    }
    this.lastText = nextText
  }
}
