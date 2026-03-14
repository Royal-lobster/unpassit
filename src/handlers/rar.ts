import type { Handler } from "./types.js";
import fs from "node:fs";
import path from "node:path";
import archiver from "archiver";
import { createTempDir, removeTempDir } from "../utils.js";

export const rarHandler: Handler = {
  extensions: [".rar"],
  async unlock(inputPath, outputPath, password) {
    const { createExtractorFromFile } = await import("node-unrar-js");
    const tmpDir = await createTempDir();

    try {
      const extractor = await createExtractorFromFile({
        filepath: inputPath,
        targetPath: tmpDir,
        password,
      });

      const extracted = extractor.extract();
      const files = [...extracted.files];

      if (files.length === 0) {
        throw new Error("No files extracted — possibly incorrect password");
      }

      // Re-archive as ZIP (RAR cannot be re-created)
      await new Promise<void>((resolve, reject) => {
        const output = fs.createWriteStream(outputPath);
        const archive = archiver("zip", { zlib: { level: 9 } });

        output.on("close", resolve);
        archive.on("error", reject);

        archive.pipe(output);
        archive.directory(tmpDir, false);
        archive.finalize();
      });
    } finally {
      await removeTempDir(tmpDir);
    }
  },
};
