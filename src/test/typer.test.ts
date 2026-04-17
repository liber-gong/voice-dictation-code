import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { commonPrefixLen, diffReplace } from '../typer'

describe('commonPrefixLen', () => {
  it('returns 0 when strings diverge at index 0', () => {
    assert.equal(commonPrefixLen('abc', 'xyz'), 0)
    assert.equal(commonPrefixLen('', 'abc'), 0)
    assert.equal(commonPrefixLen('abc', ''), 0)
  })

  it('returns full length when one is a prefix of the other', () => {
    assert.equal(commonPrefixLen('abc', 'abcdef'), 3)
    assert.equal(commonPrefixLen('abcdef', 'abc'), 3)
    assert.equal(commonPrefixLen('abc', 'abc'), 3)
  })

  it('stops at the first diverging char', () => {
    assert.equal(commonPrefixLen('hello world', 'hello there'), 6)
  })
})

describe('diffReplace', () => {
  it('empty → text: types everything', () => {
    assert.deepStrictEqual(diffReplace('', 'hello'), [
      { op: 'type', text: 'hello' },
    ])
  })

  it('text → empty: backspaces everything', () => {
    assert.deepStrictEqual(diffReplace('hello', ''), [
      { op: 'backspace', n: 5 },
    ])
  })

  it('append only: types the suffix, no backspace', () => {
    assert.deepStrictEqual(diffReplace('hello', 'hello world'), [
      { op: 'type', text: ' world' },
    ])
  })

  it('truncate only: backspaces the suffix, no type', () => {
    assert.deepStrictEqual(diffReplace('hello world', 'hello'), [
      { op: 'backspace', n: 6 },
    ])
  })

  it('complete replacement: backspace all, then type all', () => {
    assert.deepStrictEqual(diffReplace('abc', 'xyz'), [
      { op: 'backspace', n: 3 },
      { op: 'type', text: 'xyz' },
    ])
  })

  it('midway divergence: backspace tail, then type new tail', () => {
    assert.deepStrictEqual(diffReplace('hello world', 'hello there'), [
      { op: 'backspace', n: 5 },
      { op: 'type', text: 'there' },
    ])
  })

  it('no-op when unchanged', () => {
    assert.deepStrictEqual(diffReplace('hello', 'hello'), [])
    assert.deepStrictEqual(diffReplace('', ''), [])
  })
})
