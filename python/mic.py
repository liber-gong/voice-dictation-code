#!/usr/bin/env python3
"""
Capture mic audio as 16kHz mono Int16 PCM and stream raw bytes to stdout.
Exits when stdin receives a 'q' line or EOF.
"""
import sys
import threading

import sounddevice as sd

SAMPLE_RATE = 16000
CHUNK_MS = 200
CHUNK_SAMPLES = SAMPLE_RATE * CHUNK_MS // 1000  # 3200

stop = threading.Event()


def watch_stdin():
    try:
        for line in sys.stdin:
            if line.strip().lower() == "q":
                break
    finally:
        stop.set()


def callback(indata, _frames, _time, status):
    if status:
        print(f"[mic] {status}", file=sys.stderr, flush=True)
    sys.stdout.buffer.write(bytes(indata))
    sys.stdout.buffer.flush()


def main():
    threading.Thread(target=watch_stdin, daemon=True).start()
    with sd.RawInputStream(
        samplerate=SAMPLE_RATE,
        channels=1,
        dtype="int16",
        blocksize=CHUNK_SAMPLES,
        callback=callback,
    ):
        stop.wait()


if __name__ == "__main__":
    main()
