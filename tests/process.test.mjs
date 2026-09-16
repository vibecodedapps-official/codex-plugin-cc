import test from "node:test";
import assert from "node:assert/strict";

import { terminateProcessTree } from "../plugins/codex/scripts/lib/process.mjs";

test("terminateProcessTree uses taskkill on Windows", () => {
  let captured = null;
  const outcome = terminateProcessTree(1234, {
    platform: "win32",
    runCommandImpl(command, args) {
      captured = { command, args };
      return {
        command,
        args,
        status: 0,
        signal: null,
        stdout: "",
        stderr: "",
        error: null
      };
    },
    killImpl() {
      throw new Error("kill fallback should not run");
    }
  });

  assert.deepEqual(captured, {
    command: "taskkill",
    args: ["/PID", "1234", "/T", "/F"]
  });
  assert.equal(outcome.delivered, true);
  assert.equal(outcome.method, "taskkill");
});

test("terminateProcessTree treats missing Windows processes as already stopped", () => {
  const outcome = terminateProcessTree(1234, {
    platform: "win32",
    runCommandImpl(command, args) {
      return {
        command,
        args,
        status: 128,
        signal: null,
        stdout: "ERROR: The process \"1234\" not found.",
        stderr: "",
        error: null
      };
    }
  });

  assert.equal(outcome.attempted, true);
  assert.equal(outcome.method, "taskkill");
  assert.equal(outcome.result.status, 128);
  assert.match(outcome.result.stdout, /not found/i);
});

function taskkillTreeFailure(command, args) {
  return {
    command,
    args,
    status: 128,
    signal: null,
    stdout: "",
    stderr: "ERROR: The process with PID 888 (child process of PID 1234) could not be terminated.\nReason: The operation attempted is not supported.",
    error: null
  };
}

test("terminateProcessTree treats a taskkill tree failure as delivered when the root process is gone", () => {
  const probes = [];
  const outcome = terminateProcessTree(1234, {
    platform: "win32",
    runCommandImpl: taskkillTreeFailure,
    killImpl(pid, signal) {
      probes.push([pid, signal]);
      const error = new Error("no such process");
      error.code = "ESRCH";
      throw error;
    }
  });

  assert.deepEqual(probes, [[1234, 0]]);
  assert.equal(outcome.delivered, true);
  assert.equal(outcome.method, "taskkill");
  assert.equal(outcome.result.status, 128);
});

test("terminateProcessTree still fails when taskkill fails and the root process is alive", () => {
  assert.throws(
    () =>
      terminateProcessTree(1234, {
        platform: "win32",
        runCommandImpl: taskkillTreeFailure,
        killImpl() {}
      }),
    /taskkill \/PID 1234 \/T \/F: exit=128: ERROR: The process with PID 888/
  );
});
