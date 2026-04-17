import * as vscode from 'vscode'

export interface DictationConfig {
  apiKey: string;
  appId: string;
  accessToken: string;
  model: string;
  endpoint: string;
  pythonPath: string;
}

const SECTION = 'voice-dictation-code'

export function getConfig(): DictationConfig {
  const cfg = vscode.workspace.getConfiguration(SECTION)
  return {
    apiKey: cfg.get<string>('apiKey', ''),
    appId: cfg.get<string>('appId', ''),
    accessToken: cfg.get<string>('accessToken', ''),
    model: cfg.get<string>('model', ''),
    endpoint: cfg.get<string>('endpoint', ''),
    pythonPath: cfg.get<string>('pythonPath', 'python3'),
  }
}

export type DictationMode = 'default' | 'stream'
