import * as vscode from 'vscode'
import { bytedanceProvider } from './asr/bytedance'
import { DictationMode, getConfig } from './config'
import { initLogger, initTranscript, log } from './logger'
import { ensurePythonReady } from './pythonEnv'
import { DictationSession } from './session'
import { StatusBar } from './statusBar'
import { Typer } from './typer'

const CMD_DEFAULT = 'voice-dictation-code.dictate'
const CMD_STREAM = 'voice-dictation-code.dictate-stream'
const CMD_STATUS_CLICK = 'voice-dictation-code.status-bar-click'

const isMac = process.platform === 'darwin'
const SC_DEFAULT = isMac ? '⌃⌘V' : 'Ctrl+Alt+V'
const SC_STREAM = isMac ? '⌃⌘⇧V' : 'Ctrl+Alt+Shift+V'

let session: DictationSession | undefined
let typer: Typer | undefined

async function dictate(
  context: vscode.ExtensionContext,
  statusBar: StatusBar,
  mode: DictationMode,
): Promise<void> {
  // Any running session stops, regardless of which shortcut started it.
  if (session?.isActive()) { session.stop(); return }

  const config = getConfig()
  if (!config.apiKey && !(config.appId && config.accessToken)) {
    vscode.window.showWarningMessage(
      'Voice Dictation: set `voice-dictation-code.apiKey`, or `appId` + `accessToken`, in settings.',
    )
    return
  }

  const reqPath = vscode.Uri.joinPath(context.extensionUri, 'python', 'requirements.txt').fsPath
  const python = await ensurePythonReady(config.pythonPath, context.globalStorageUri.fsPath, reqPath)
  if (!python) { return }

  const micScript = vscode.Uri.joinPath(context.extensionUri, 'python', 'mic.py').fsPath
  const typerScript = vscode.Uri.joinPath(context.extensionUri, 'python', 'typer.py').fsPath

  typer ??= new Typer(python, typerScript)
  session = new DictationSession({
    config,
    provider: bytedanceProvider,
    mode,
    python,
    micScript,
    typer,
    statusBar,
  })
  await session.start()
}

async function onStatusBarClick(context: vscode.ExtensionContext, statusBar: StatusBar): Promise<void> {
  if (session?.isActive()) { session.stop(); return }

  const items: (vscode.QuickPickItem & { mode: DictationMode })[] = [
    {
      label: '$(mic) Default Mode',
      description: SC_DEFAULT,
      detail: 'Text appears when you stop speaking. Good for switching windows while talking.',
      mode: 'default',
    },
    {
      label: '$(broadcast) Stream Mode',
      description: SC_STREAM,
      detail: 'Types live as you speak. Auto-stops if you switch windows.',
      mode: 'stream',
    },
  ]
  const picked = await vscode.window.showQuickPick(items, {
    title: 'Voice Dictation',
    placeHolder: 'Choose a dictation mode',
  })
  if (!picked) { return }
  await dictate(context, statusBar, picked.mode)
}

export function activate(context: vscode.ExtensionContext) {
  const outputChannel = initLogger()
  const transcriptChannel = initTranscript()
  log('ext', 'extension activating')

  const statusBar = new StatusBar(CMD_STATUS_CLICK)

  const defaultCmd = vscode.commands.registerCommand(
    CMD_DEFAULT,
    () => dictate(context, statusBar, 'default'),
  )
  const streamCmd = vscode.commands.registerCommand(
    CMD_STREAM,
    () => dictate(context, statusBar, 'stream'),
  )
  const statusClickCmd = vscode.commands.registerCommand(
    CMD_STATUS_CLICK,
    () => onStatusBarClick(context, statusBar),
  )

  context.subscriptions.push(
    defaultCmd,
    streamCmd,
    statusClickCmd,
    outputChannel,
    transcriptChannel,
    { dispose: () => statusBar.dispose() },
  )
}

export function deactivate() {
  session?.dispose()
  typer?.stop()
  session = undefined
  typer = undefined
}
