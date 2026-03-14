import { describe, it } from "node:test";
import assert from "node:assert";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const CLI = path.resolve("dist/cli.js");

describe("CLI e2e", () => {
  it("prints help text", () => {
    const output = execFileSync("node", [CLI, "--help"], { encoding: "utf8" });
    assert.ok(output.includes("Remove passwords from protected files"));
    assert.ok(output.includes("--password"));
    assert.ok(output.includes("--output"));
  });

  it("prints version", () => {
    const output = execFileSync("node", [CLI, "-V"], { encoding: "utf8" });
    assert.match(output.trim(), /^\d+\.\d+\.\d+$/);
  });

  it("exits with error for missing file", () => {
    assert.throws(
      () => execFileSync("node", [CLI, "nonexistent.pdf", "-p", "pass"], {
        encoding: "utf8",
        stdio: "pipe",
      }),
      (err: any) => err.status === 2
    );
  });

  it("exits with error for unsupported format", () => {
    const tmp = path.join("/tmp", "test-unpassit.png");
    fs.writeFileSync(tmp, "fake");
    try {
      assert.throws(
        () => execFileSync("node", [CLI, tmp, "-p", "pass"], {
          encoding: "utf8",
          stdio: "pipe",
        }),
        (err: any) => err.status === 1
      );
    } finally {
      fs.unlinkSync(tmp);
    }
  });
});
