import type { Handler } from "./types.js";
export const officeHandler: Handler = {
  extensions: [".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"],
  async unlock(inputPath, outputPath, password) { throw new Error("Office handler not implemented"); },
};
