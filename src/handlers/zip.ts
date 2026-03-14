import type { Handler } from "./types.js";
import fs from "node:fs";
import path from "node:path";
import { Open } from "unzipper";
import archiver from "archiver";
import { createTempDir, removeTempDir } from "../utils.js";

export const zipHandler: Handler = {
  extensions: [".zip"],
  async unlock(inputPath, outputPath, password) {
    const tmpDir = await createTempDir();

    try {
      // Extract with password
      const directory = await Open.file(inputPath);
      await Promise.all(
        directory.files
          .filter((f) => f.type !== "Directory")
          .map(async (file) => {
            const filePath = path.join(tmpDir, file.path);
            await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
            const content = await file.buffer(password);
            await fs.promises.writeFile(filePath, content);
          })
      );

      // Re-archive without password
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
