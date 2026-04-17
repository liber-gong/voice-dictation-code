export interface FinalTextSinks {
  appendTranscript: (t: string) => void;
  showTranscript: () => void;
  type: (t: string) => void;
}

/**
 * Handle a final recognition result: mirror it to the transcript panel (always)
 * and push it to the typer. Aborted sessions drop everything.
 */
export function handleFinalText(text: string, aborted: boolean, sinks: FinalTextSinks): void {
  if (aborted) { return }
  sinks.appendTranscript(text)
  sinks.showTranscript()
  sinks.type(text)
}
