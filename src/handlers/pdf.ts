import type { Handler } from "./types.js";
export const pdfHandler: Handler = {
  extensions: [".pdf"],
  async unlock(inputPath, outputPath, password) { throw new Error("PDF handler not implemented"); },
};
