import { describe, it } from "node:test";
import assert from "node:assert";
import { getSupportedExtensions, isSupportedFile } from "./detector.js";

describe("detector", () => {
  it("recognizes .pdf as supported", () => {
    assert.strictEqual(isSupportedFile("report.pdf"), true);
  });
  it("recognizes .xlsx as supported", () => {
    assert.strictEqual(isSupportedFile("data.xlsx"), true);
  });
  it("recognizes .zip as supported", () => {
    assert.strictEqual(isSupportedFile("archive.zip"), true);
  });
  it("recognizes .rar as supported", () => {
    assert.strictEqual(isSupportedFile("archive.rar"), true);
  });
  it("recognizes .7z as supported", () => {
    assert.strictEqual(isSupportedFile("archive.7z"), true);
  });
  it("rejects unsupported extensions", () => {
    assert.strictEqual(isSupportedFile("image.png"), false);
  });
  it("is case-insensitive", () => {
    assert.strictEqual(isSupportedFile("FILE.PDF"), true);
  });
  it("returns all supported extensions", () => {
    const exts = getSupportedExtensions();
    assert.ok(exts.includes(".pdf"));
    assert.ok(exts.includes(".docx"));
    assert.ok(exts.includes(".zip"));
    assert.ok(exts.includes(".rar"));
    assert.ok(exts.includes(".7z"));
  });
});
