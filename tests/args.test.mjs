import test from "node:test";
import assert from "node:assert/strict";

import { parseArgs, splitRawArgumentString } from "../plugins/codex/scripts/lib/args.mjs";

test("parseArgs throws naming the unknown long option and the command", () => {
  assert.throws(
    () =>
      parseArgs(["--write"], {
        valueOptions: ["base"],
        booleanOptions: ["json"],
        commandName: "review"
      }),
    /^Error: Unknown option "--write" for review\. Supported options: --base, --json\. Put free text after "--" to pass it through\.$/
  );
});

test("parseArgs throws naming the unknown short option", () => {
  assert.throws(
    () =>
      parseArgs(["-w"], {
        booleanOptions: ["json"],
        commandName: "review"
      }),
    /^Error: Unknown option "-w" for review\./
  );
});

test("parseArgs keeps tokens after -- as positionals even when they look like options", () => {
  const { options, positionals } = parseArgs(["--", "--write", "-w"], {
    booleanOptions: ["write"],
    commandName: "task"
  });
  assert.deepEqual(options, {});
  assert.deepEqual(positionals, ["--write", "-w"]);
});

test("parseArgs still parses known options normally", () => {
  const { options, positionals } = parseArgs(["--base", "main", "--json", "fix", "it"], {
    valueOptions: ["base"],
    booleanOptions: ["json"],
    commandName: "review"
  });
  assert.deepEqual(options, { base: "main", json: true });
  assert.deepEqual(positionals, ["fix", "it"]);
});

test("parseArgs still resolves an alias to its canonical option", () => {
  const { options } = parseArgs(["-m", "spark"], {
    valueOptions: ["model"],
    aliasMap: { m: "model" },
    commandName: "task"
  });
  assert.deepEqual(options, { model: "spark" });
});

test("parseArgs keeps a lone - as a positional", () => {
  const { options, positionals } = parseArgs(["-"], {
    booleanOptions: ["json"],
    commandName: "task"
  });
  assert.deepEqual(options, {});
  assert.deepEqual(positionals, ["-"]);
});

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
