import test from "node:test";
import assert from "node:assert/strict";

import { splitRawArgumentString } from "../plugins/codex/scripts/lib/args.mjs";

test("splitRawArgumentString keeps backslashes in an unquoted Windows path", () => {
  assert.deepEqual(splitRawArgumentString("C:\\Users\\me\\repo"), ["C:\\Users\\me\\repo"]);
});

test("splitRawArgumentString keeps backslashes in a quoted Windows path with a space", () => {
  assert.deepEqual(splitRawArgumentString('--cwd "C:\\Users\\me\\my repo"'), [
    "--cwd",
    "C:\\Users\\me\\my repo"
  ]);
});

test("splitRawArgumentString keeps a trailing backslash", () => {
  assert.deepEqual(splitRawArgumentString("C:\\Users\\me\\"), ["C:\\Users\\me\\"]);
});

test("splitRawArgumentString keeps an apostrophe inside prose instead of treating it as a delimiter", () => {
  assert.deepEqual(splitRawArgumentString("--write it's broken"), ["--write", "it's", "broken"]);
});

test("splitRawArgumentString keeps a mid-token double quote as a literal character", () => {
  // The quote is inside the word "buil\"d", not at the start of a token, so it must
  // not open a quoted run (which would otherwise swallow the rest of the line).
  assert.deepEqual(splitRawArgumentString('why the buil"d step fails'), [
    "why",
    "the",
    'buil"d',
    "step",
    "fails"
  ]);
});

test("splitRawArgumentString still splits a quoted path with a space when the quote opens at a token boundary", () => {
  assert.deepEqual(splitRawArgumentString('--cwd "C:\\My Code\\repo" do something'), [
    "--cwd",
    "C:\\My Code\\repo",
    "do",
    "something"
  ]);
});

test("splitRawArgumentString still splits a single-quoted path with a space", () => {
  assert.deepEqual(splitRawArgumentString("--cwd 'C:\\Users\\me\\my repo' do something"), [
    "--cwd",
    "C:\\Users\\me\\my repo",
    "do",
    "something"
  ]);
});
