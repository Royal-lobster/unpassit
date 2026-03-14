import type { Handler } from "./types.js";
export const zipHandler: Handler = {
  extensions: [".zip"],
  async unlock(inputPath, outputPath, password) { throw new Error("ZIP handler not implemented"); },
};
