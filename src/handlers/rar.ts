import type { Handler } from "./types.js";
export const rarHandler: Handler = {
  extensions: [".rar"],
  async unlock(inputPath, outputPath, password) { throw new Error("RAR handler not implemented"); },
};
