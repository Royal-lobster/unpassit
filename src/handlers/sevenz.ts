import type { Handler } from "./types.js";
export const sevenzHandler: Handler = {
  extensions: [".7z"],
  async unlock(inputPath, outputPath, password) { throw new Error("7z handler not implemented"); },
};
