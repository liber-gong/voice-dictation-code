import { gunzipSync } from 'node:zlib'

// Binary frame layout:
//   header: 4 bytes
//     [0] version(4)=1 | header_size(4)=1 -> 0x11
//     [1] message_type(4) | flags(4)
//     [2] serialization(4) | compression(4)
//     [3] reserved = 0
//   [4..8)   payload size (big-endian uint32)
//   [8..]    payload (optionally gzipped)

export const MT_FULL_CLIENT = 0b0001
export const MT_AUDIO_ONLY = 0b0010
export const MT_FULL_SERVER = 0b1001
export const MT_SERVER_ERROR = 0b1111

export const SER_JSON = 0b0001
export const SER_NONE = 0b0000
export const COMP_GZIP = 0b0001

export const FLAG_LAST_PACKET = 0b0010

export function buildHeader(
  messageType: number,
  flags: number,
  serialization: number,
  compression: number,
): Buffer {
  const h = Buffer.alloc(4)
  h[0] = (0b0001 << 4) | 0b0001
  h[1] = (messageType << 4) | flags
  h[2] = (serialization << 4) | compression
  h[3] = 0
  return h
}

export function buildFrame(header: Buffer, payload: Buffer): Buffer {
  const size = Buffer.alloc(4)
  size.writeUInt32BE(payload.length, 0)
  return Buffer.concat([header, size, payload])
}

export interface ParsedFrame {
  messageType: number;
  flags: number;
  payload: Buffer;
}

export function parseFrame(buf: Buffer): ParsedFrame {
  const headerSize = (buf[0] & 0x0f) * 4
  const messageType = buf[1] >> 4
  const flags = buf[1] & 0x0f
  const compression = buf[2] & 0x0f
  let offset = headerSize
  // Flag 0b0001 = sequence number present (4 bytes after header).
  if (flags & 0b0001) { offset += 4 }
  const payloadSize = buf.readUInt32BE(offset)
  offset += 4
  let payload = buf.subarray(offset, offset + payloadSize)
  if (compression === COMP_GZIP && payload.length > 0) { payload = gunzipSync(payload) }
  return { messageType, flags, payload: Buffer.from(payload) }
}
