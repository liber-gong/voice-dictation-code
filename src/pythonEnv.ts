import { spawn } from 'node:child_process'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as vscode from 'vscode'
import { log, showLog } from './logger'

export function venvPythonPath(venvDir: string): string {
  return process.platform === 'win32'
    ? path.join(venvDir, 'Scripts', 'python.exe')
    : path.join(venvDir, 'bin', 'python3')
}

export async function venvExists(venvDir: string): Promise<boolean> {
  try { await fs.access(venvPythonPath(venvDir)); return true } catch { return false }
}

export function checkPythonDeps(pythonPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const p = spawn(pythonPath, ['-c', 'import sounddevice, pynput'], { stdio: 'ignore' })
    p.on('exit', (code) => resolve(code === 0))
    p.on('error', () => resolve(false))
  })
}

export function createVenv(bootstrapPython: string, venvDir: string): Promise<void> {
  return runPython(bootstrapPython, ['-m', 'venv', venvDir], 'venv')
}

export function installPythonDeps(pythonPath: string, requirementsPath: string): Promise<void> {
  return runPython(pythonPath, ['-m', 'pip', 'install', '-r', requirementsPath], 'pip')
}

/**
 * Ensure a working venv with mic/typer deps exists under `storageDir/venv`.
 * Returns the venv's python path, or undefined if the user declined or setup failed.
 * Prompts once on first run.
 */
export async function ensurePythonReady(
  bootstrapPython: string,
  storageDir: string,
  requirementsPath: string,
): Promise<string | undefined> {
  const venvDir = path.join(storageDir, 'venv')
  const venvPy = venvPythonPath(venvDir)

  if (await venvExists(venvDir) && await checkPythonDeps(venvPy)) {
    return venvPy
  }

  const choice = await vscode.window.showInformationMessage(
    'Voice Dictation needs a moment to finish installing. This only happens once.',
    'Continue',
    'Not Now',
  )
  if (choice !== 'Continue') { return undefined }

  try {
    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: 'Getting Voice Dictation ready…' },
      async (progress) => {
        if (!await venvExists(venvDir)) {
          progress.report({ message: 'this only takes a moment' })
          await fs.mkdir(storageDir, { recursive: true })
          await createVenv(bootstrapPython, venvDir)
        }
        progress.report({ message: 'almost done' })
        await installPythonDeps(venvPy, requirementsPath)
      },
    )
  } catch (err) {
    vscode.window.showErrorMessage(
      `Voice Dictation: couldn't finish installing — ${(err as Error).message}. See Output → Voice Dictation for details.`,
    )
    showLog()
    return undefined
  }
  return venvPy
}

function runPython(pythonPath: string, args: string[], tag: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(pythonPath, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stderrTail = ''
    p.stdout?.on('data', (d: Buffer) => log('mic', `${tag}: ${d.toString().trimEnd()}`))
    p.stderr?.on('data', (d: Buffer) => {
      const text = d.toString()
      log('mic', `${tag}: ${text.trimEnd()}`)
      stderrTail = (stderrTail + text).slice(-800)
    })
    p.on('exit', (code) => {
      if (code === 0) { resolve(); return }
      const hint = stderrTail.trim().split('\n').slice(-3).join(' · ')
      reject(new Error(`${tag} exit ${code}${hint ? ` — ${hint}` : ''}`))
    })
    p.on('error', reject)
  })
}
