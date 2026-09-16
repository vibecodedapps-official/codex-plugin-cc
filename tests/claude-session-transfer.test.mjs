import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import test from "node:test";
import assert from "node:assert/strict";

import { resolveClaudeSessionPath } from "../plugins/codex/scripts/lib/claude-session-transfer.mjs";
import { makeTempDir } from "./helpers.mjs";

const HOME_ENV_VAR = process.platform === "win32" ? "USERPROFILE" : "HOME";

function writeSession(dir, name = "session.jsonl") {
  fs.mkdirSync(dir, { recursive: true });
  const sourcePath = path.join(dir, name);
  fs.writeFileSync(sourcePath, `${JSON.stringify({ type: "user", message: { role: "user", content: "hi" } })}\n`, "utf8");
  return sourcePath;
}

test("resolveClaudeSessionPath resolves the projects dir at call time, not import time", (t) => {
  const originalConfigDir = process.env.CLAUDE_CONFIG_DIR;
  const originalHomeEnv = process.env[HOME_ENV_VAR];
  t.after(() => {
    if (originalConfigDir === undefined) {
      delete process.env.CLAUDE_CONFIG_DIR;
    } else {
      process.env.CLAUDE_CONFIG_DIR = originalConfigDir;
    }
    if (originalHomeEnv === undefined) {
      delete process.env[HOME_ENV_VAR];
    } else {
      process.env[HOME_ENV_VAR] = originalHomeEnv;
    }
  });

  // 1. CLAUDE_CONFIG_DIR points at temp dir A: a source under A/projects is accepted.
  const tempA = makeTempDir();
  const sourceA = writeSession(path.join(tempA, "projects", "proj-a"));
  process.env.CLAUDE_CONFIG_DIR = tempA;
  const resolvedA = resolveClaudeSessionPath(process.cwd(), { source: sourceA });
  assert.equal(resolvedA, fs.realpathSync(sourceA));

  // 2. CLAUDE_CONFIG_DIR switched to temp dir B: the same source A is now rejected,
  // and a source under B/projects is accepted. Proves call-time resolution.
  const tempB = makeTempDir();
  const sourceB = writeSession(path.join(tempB, "projects", "proj-b"));
  process.env.CLAUDE_CONFIG_DIR = tempB;
  assert.throws(
    () => resolveClaudeSessionPath(process.cwd(), { source: sourceA }),
    /only from/
  );
  const resolvedB = resolveClaudeSessionPath(process.cwd(), { source: sourceB });
  assert.equal(resolvedB, fs.realpathSync(sourceB));

  // 3. CLAUDE_CONFIG_DIR unset, falls back to <home>/.claude/projects.
  delete process.env.CLAUDE_CONFIG_DIR;
  const tempHome = makeTempDir();
  process.env[HOME_ENV_VAR] = tempHome;
  const sourceInHome = writeSession(path.join(tempHome, ".claude", "projects", "proj-home"));
  const outsideHome = writeSession(makeTempDir());
  const resolvedHome = resolveClaudeSessionPath(process.cwd(), { source: sourceInHome });
  assert.equal(resolvedHome, fs.realpathSync(sourceInHome));
  assert.throws(
    () => resolveClaudeSessionPath(process.cwd(), { source: outsideHome }),
    /only from/
  );
});
