import path from "node:path";
import { getHandler, getAllExtensions } from "./handlers/index.js";
import type { Handler } from "./handlers/types.js";

export function detectHandler(filePath: string): Handler | undefined {
  const ext = path.extname(filePath).toLowerCase();
  return getHandler(ext);
}

export function isSupportedFile(filePath: string): boolean {
  return detectHandler(filePath) !== undefined;
}

export function getSupportedExtensions(): string[] {
  return getAllExtensions();
}
