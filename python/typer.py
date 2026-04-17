#!/usr/bin/env python3
"""
Long-lived typing helper. Reads newline-delimited JSON from stdin and
simulates keystrokes to whatever window currently has focus.

Commands:
  {"op": "type", "text": "hello"}
  {"op": "backspace", "n": 3}
  "q" to exit.
"""
import json
import sys

from pynput.keyboard import Controller, Key

kb = Controller()


def handle(cmd):
    op = cmd.get("op")
    if op == "type":
        kb.type(cmd.get("text", ""))
    elif op == "backspace":
        for _ in range(int(cmd.get("n", 0))):
            kb.press(Key.backspace)
            kb.release(Key.backspace)


def main():
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        if line == "q":
            break
        try:
            cmd = json.loads(line)
        except Exception as e:
            print(f"[typer] parse fail: {e}", file=sys.stderr, flush=True)
            continue
        try:
            handle(cmd)
        except Exception as e:
            print(f"[typer] op fail: {e}", file=sys.stderr, flush=True)


if __name__ == "__main__":
    main()
