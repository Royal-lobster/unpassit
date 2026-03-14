import type { Handler } from "./types.js";
import { decrypt } from "node-qpdf2";

export const pdfHandler: Handler = {
  extensions: [".pdf"],
  async unlock(inputPath, outputPath, password) {
    try {
      await decrypt({
        input: inputPath,
        output: outputPath,
        password: password,
      });
    } catch (err: any) {
      if (err.message?.includes("invalid password")) {
        throw new Error("Incorrect password");
      }
      if (err.message?.includes("qpdf") && err.message?.includes("not found")) {
        throw new Error(
          "qpdf is required for PDF files. Install with: brew install qpdf (macOS) or apt install qpdf (Linux)"
        );
      }
      throw err;
    }
  },
};
