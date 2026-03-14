import { describe, it } from "node:test";
import assert from "node:assert";
import { getOutputPath } from "./utils.js";

describe("getOutputPath", () => {
  it("inserts .unlocked before extension", () => {
    assert.strictEqual(getOutputPath("/tmp/report.pdf"), "/tmp/report.unlocked.pdf");
  });

  it("handles nested paths", () => {
    assert.strictEqual(
      getOutputPath("/home/user/docs/file.xlsx"),
      "/home/user/docs/file.unlocked.xlsx"
    );
  });

  it("handles .rar files by outputting .unlocked.zip", () => {
    assert.strictEqual(getOutputPath("/tmp/archive.rar"), "/tmp/archive.unlocked.zip");
  });

  it("respects custom output directory", () => {
    assert.strictEqual(
      getOutputPath("/tmp/report.pdf", "/out"),
      "/out/report.unlocked.pdf"
    );
  });
});
