import type { Handler } from "./types.js";
import fs from "node:fs";

export const officeHandler: Handler = {
  extensions: [".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"],
  async unlock(inputPath, outputPath, password) {
    // officecrypto-tool is a CJS module with default export
    const officeCrypto = (await import("officecrypto-tool")).default;
    const inputBuffer = await fs.promises.readFile(inputPath);

    try {
      const decryptedBuffer = await officeCrypto.decrypt(inputBuffer, {
        password,
      });
      await fs.promises.writeFile(outputPath, decryptedBuffer);
    } catch (err: any) {
      if (err.message?.toLowerCase().includes("password")) {
        throw new Error("Incorrect password");
      }
      throw err;
    }
  },
};
