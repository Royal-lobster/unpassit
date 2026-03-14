import type { Handler } from "./types.js";
import { createTempDir, removeTempDir } from "../utils.js";

export const sevenzHandler: Handler = {
  extensions: [".7z"],
  async unlock(inputPath, outputPath, password) {
    const sevenZip = await import("7zip-min");
    const tmpDir = await createTempDir();

    try {
      // Extract with password using cmd() — unpack() does not support passwords
      await new Promise<void>((resolve, reject) => {
        sevenZip.cmd(
          ["x", inputPath, `-p${password}`, `-o${tmpDir}`, "-y"],
          (err: Error | null) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      // Re-archive as 7z without password
      await new Promise<void>((resolve, reject) => {
        sevenZip.pack(tmpDir, outputPath, (err: Error | null) => {
          if (err) reject(err);
          else resolve();
        });
      });
    } finally {
      await removeTempDir(tmpDir);
    }
  },
};
