import type { Handler } from "./types.js";
import { pdfHandler } from "./pdf.js";
import { officeHandler } from "./office.js";
import { zipHandler } from "./zip.js";
import { rarHandler } from "./rar.js";
import { sevenzHandler } from "./sevenz.js";

const handlers: Handler[] = [pdfHandler, officeHandler, zipHandler, rarHandler, sevenzHandler];
const extensionMap = new Map<string, Handler>();

for (const handler of handlers) {
  for (const ext of handler.extensions) {
    extensionMap.set(ext.toLowerCase(), handler);
  }
}

export function getHandler(ext: string): Handler | undefined {
  return extensionMap.get(ext.toLowerCase());
}

export function getAllExtensions(): string[] {
  return [...extensionMap.keys()];
}
