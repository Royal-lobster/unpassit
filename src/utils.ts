import path from "node:path";
import fs from "node:fs";
import os from "node:os";

export function getOutputPath(inputPath: string, outputDir?: string): string {
  const dir = outputDir ?? path.dirname(inputPath);
  const ext = path.extname(inputPath);
  const base = path.basename(inputPath, ext);
  const outputExt = ext.toLowerCase() === ".rar" ? ".zip" : ext;
  return path.join(dir, `${base}.unlocked${outputExt}`);
}

export function createTempDir(): Promise<string> {
  return fs.promises.mkdtemp(path.join(os.tmpdir(), "unpassit-"));
}

export async function removeTempDir(dir: string): Promise<void> {
  await fs.promises.rm(dir, { recursive: true, force: true });
}
