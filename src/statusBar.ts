import * as vscode from 'vscode'
import { DictationMode } from './config'

const isMac = process.platform === 'darwin'
const SC_DEFAULT = isMac ? '⌃⌘V' : 'Ctrl+Alt+V'
const SC_STREAM = isMac ? '⌃⌘⇧V' : 'Ctrl+Alt+Shift+V'

const WARNING_BG = new vscode.ThemeColor('statusBarItem.warningBackground')
const WARNING_FG = new vscode.ThemeColor('statusBarItem.warningForeground')

const MODE_LABEL: Record<DictationMode, string> = {
  default: 'Dictating · Default Mode',
  stream: 'Dictating · Stream Mode',
}

function idleTooltip(): vscode.MarkdownString {
  const md = new vscode.MarkdownString(
    `**Voice Dictation** — use different mode in different cases\n\n` +
    `- \`${SC_DEFAULT}\` **Default** — text appears when you stop speaking. ` +
    `Good for switching windows while talking.\n` +
    `- \`${SC_STREAM}\` **Stream** — types live as you speak. ` +
    `Auto-stops if you switch windows.\n\n` +
    `_Tip: prefer the keyboard shortcut — in Default mode it inserts at your current cursor._`,
  )
  md.isTrusted = false
  return md
}

function activeTooltip(mode: DictationMode): vscode.MarkdownString {
  const md = mode === 'stream'
    ? new vscode.MarkdownString(
      `**Dictating — streaming**\n\n` +
      `Types live as you speak. Auto-stops if you switch windows.\n\n` +
      `Press \`${SC_STREAM}\` (or click) to stop.\n\n` +
      `_Other mode: \`${SC_DEFAULT}\` default (text appears when you finish)._`,
    )
    : new vscode.MarkdownString(
      `**Dictating — default**\n\n` +
      `Text will appear when you stop speaking.\n\n` +
      `Press \`${SC_DEFAULT}\` (or click) to stop.\n\n` +
      `_Other mode: \`${SC_STREAM}\` streaming (types live while you speak)._`,
    )
  md.isTrusted = false
  return md
}

export class StatusBar {
  private readonly item: vscode.StatusBarItem

  constructor(idleCommand: string) {
    // Right-aligned with very high priority → leftmost slot of the right-side group.
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 10000)
    this.item.command = idleCommand
    this.renderIdle()
    this.item.show()
  }

  renderIdle(): void {
    this.item.text = '$(mic) Dictate'
    this.item.tooltip = idleTooltip()
    this.item.backgroundColor = undefined
    this.item.color = undefined
  }

  renderRecording(mode: DictationMode): void {
    this.item.text = `$(mic-filled) ${MODE_LABEL[mode]}`
    this.item.tooltip = activeTooltip(mode)
    this.item.backgroundColor = WARNING_BG
    this.item.color = WARNING_FG
  }

  renderProcessing(): void {
    this.item.text = '$(loading~spin) Processing'
    this.item.tooltip = 'Processing…'
    this.item.backgroundColor = undefined
    this.item.color = undefined
  }

  dispose(): void {
    this.item.dispose()
  }
}
