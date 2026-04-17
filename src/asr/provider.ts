import { DictationConfig } from '../config'

/**
 * Vendor-neutral seam. Different ASR services vary in endpoint URL, auth
 * header names, init-frame JSON shape, and response JSON layout — everything
 * else (binary framing, streaming lifecycle) is handled by AsrClient.
 *
 * To add a provider: implement this interface in a new file under `./` and
 * wire it into the extension entry point.
 */
export interface AsrProvider {
  readonly defaultEndpoint: string;
  buildAuthHeaders(config: DictationConfig, connectId: string): Record<string, string>;
  buildInitPayload(): object;
  extractText(json: unknown): string | undefined;
}
