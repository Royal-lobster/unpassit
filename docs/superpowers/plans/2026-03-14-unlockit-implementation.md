# unlockit Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an npx CLI tool that removes known passwords from PDF, Office, ZIP, RAR, and 7z files.

**Architecture:** Handler-based design where each file format has a handler implementing a shared `Handler` interface. A central CLI module resolves passwords, detects file types by extension, and dispatches to the correct handler. Batch mode iterates a directory sequentially.

**Tech Stack:** TypeScript, commander, tsup, node-qpdf2, officecrypto-tool, unzipper, archiver, node-unrar-js, 7zip-min

**Spec:** `docs/superpowers/specs/2026-03-14-unlockit-design.md`

---

## Chunk 1: Project Scaffolding + Handler Interface + Utils

### Task 1: Project Setup

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`

- [ ] **Step 1: Initialize npm project**

```bash
cd /Users/srujangurram/Developer/Personal/unlockit
npm init -y
```

- [ ] **Step 2: Install dependencies**

```bash
npm install commander node-qpdf2 officecrypto-tool unzipper archiver node-unrar-js 7zip-min
npm install -D typescript tsup @types/node
```

- [ ] **Step 3: Create tsconfig.json**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 4: Create .gitignore**

Create `.gitignore`:

```
node_modules/
dist/
*.tgz
```

- [ ] **Step 5: Configure tsup**

Add to `package.json`:

```json
{
  "type": "module",
  "bin": {
    "unlockit": "./dist/cli.js"
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup src/cli.ts --format esm --dts --clean --banner.js '#!/usr/bin/env node'",
    "dev": "tsup src/cli.ts --format esm --watch"
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add package.json tsconfig.json .gitignore package-lock.json
git commit -m "chore: scaffold project with dependencies"
```

---

### Task 2: Handler Interface + Utils

**Files:**
- Create: `src/handlers/types.ts`
- Create: `src/types.d.ts`
- Create: `src/utils.ts`
- Create: `src/utils.test.ts`

- [ ] **Step 1: Write the Handler interface and type declarations**

Create `src/handlers/types.ts`:

```typescript
export interface Handler {
  extensions: string[];
  unlock(inputPath: string, outputPath: string, password: string): Promise<void>;
}
```

Create `src/types.d.ts` (ambient declarations for packages without types):

```typescript
declare module "officecrypto-tool" {
  const officeCrypto: {
    decrypt(buffer: Buffer, options: { password: string }): Promise<Buffer>;
    encrypt(buffer: Buffer, options: { password: string }): Promise<Buffer>;
    isEncrypted(buffer: Buffer): boolean;
  };
  export default officeCrypto;
}

declare module "7zip-min" {
  export function unpack(
    archivePath: string,
    destPath: string,
    callback: (err: Error | null) => void
  ): void;
  export function pack(
    srcPath: string,
    archivePath: string,
    callback: (err: Error | null) => void
  ): void;
  export function cmd(
    args: string[],
    callback: (err: Error | null) => void
  ): void;
}
```

- [ ] **Step 2: Write failing tests for utils**

Create `src/utils.test.ts`:

```typescript
import { describe, it } from "node:test";
import assert from "node:assert";
import { getOutputPath } from "./utils.js";

describe("getOutputPath", () => {
  it("inserts .unlocked before extension", () => {
    assert.strictEqual(getOutputPath("/tmp/report.pdf"), "/tmp/report.unlocked.pdf");
  });

  it("handles nested paths", () => {
    assert.strictEqual(
      getOutputPath("/home/user/docs/file.xlsx"),
      "/home/user/docs/file.unlocked.xlsx"
    );
  });

  it("handles .rar files by outputting .unlocked.zip", () => {
    assert.strictEqual(getOutputPath("/tmp/archive.rar"), "/tmp/archive.unlocked.zip");
  });

  it("respects custom output directory", () => {
    assert.strictEqual(
      getOutputPath("/tmp/report.pdf", "/out"),
      "/out/report.unlocked.pdf"
    );
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx tsx --test src/utils.test.ts`
Expected: FAIL — `getOutputPath` not defined

- [ ] **Step 4: Implement utils**

Create `src/utils.ts`:

```typescript
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

export function getOutputPath(inputPath: string, outputDir?: string): string {
  const dir = outputDir ?? path.dirname(inputPath);
  const ext = path.extname(inputPath);
  const base = path.basename(inputPath, ext);
  const outputExt = ext.toLowerCase() === ".rar" ? ".zip" : ext;
  return path.join(dir, `${base}.unlocked${outputExt}`);
}

export function createTempDir(): Promise<string> {
  return fs.promises.mkdtemp(path.join(os.tmpdir(), "unlockit-"));
}

export async function removeTempDir(dir: string): Promise<void> {
  await fs.promises.rm(dir, { recursive: true, force: true });
}

export function log(message: string, quiet: boolean): void {
  if (!quiet) {
    console.log(message);
  }
}

export function logError(message: string): void {
  console.error(message);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx tsx --test src/utils.test.ts`
Expected: PASS — all 4 tests

- [ ] **Step 6: Commit**

```bash
git add src/handlers/types.ts src/utils.ts src/utils.test.ts
git commit -m "feat: add handler interface and utility functions"
```

---

### Task 3: Detector + Handler Registry

**Files:**
- Create: `src/detector.ts`
- Create: `src/detector.test.ts`
- Create: `src/handlers/index.ts`

- [ ] **Step 1: Write failing tests for detector**

Create `src/detector.test.ts`:

```typescript
import { describe, it } from "node:test";
import assert from "node:assert";
import { getSupportedExtensions, isSupportedFile } from "./detector.js";

describe("detector", () => {
  it("recognizes .pdf as supported", () => {
    assert.strictEqual(isSupportedFile("report.pdf"), true);
  });

  it("recognizes .xlsx as supported", () => {
    assert.strictEqual(isSupportedFile("data.xlsx"), true);
  });

  it("recognizes .zip as supported", () => {
    assert.strictEqual(isSupportedFile("archive.zip"), true);
  });

  it("recognizes .rar as supported", () => {
    assert.strictEqual(isSupportedFile("archive.rar"), true);
  });

  it("recognizes .7z as supported", () => {
    assert.strictEqual(isSupportedFile("archive.7z"), true);
  });

  it("rejects unsupported extensions", () => {
    assert.strictEqual(isSupportedFile("image.png"), false);
  });

  it("is case-insensitive", () => {
    assert.strictEqual(isSupportedFile("FILE.PDF"), true);
  });

  it("returns all supported extensions", () => {
    const exts = getSupportedExtensions();
    assert.ok(exts.includes(".pdf"));
    assert.ok(exts.includes(".docx"));
    assert.ok(exts.includes(".zip"));
    assert.ok(exts.includes(".rar"));
    assert.ok(exts.includes(".7z"));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx tsx --test src/detector.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement detector and handler registry**

Create `src/handlers/index.ts`:

```typescript
import type { Handler } from "./types.js";
import { pdfHandler } from "./pdf.js";
import { officeHandler } from "./office.js";
import { zipHandler } from "./zip.js";
import { rarHandler } from "./rar.js";
import { sevenzHandler } from "./sevenz.js";

const handlers: Handler[] = [
  pdfHandler,
  officeHandler,
  zipHandler,
  rarHandler,
  sevenzHandler,
];

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
```

Create `src/detector.ts`:

```typescript
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
```

**Note:** This step requires handler stubs to exist. Create them as part of the next tasks, then come back and run these tests. Alternatively, create minimal stubs now — see Task 4 Step 1.

- [ ] **Step 4: Create handler stubs**

Create each handler file with a minimal stub so the registry compiles:

`src/handlers/pdf.ts`:
```typescript
import type { Handler } from "./types.js";

export const pdfHandler: Handler = {
  extensions: [".pdf"],
  async unlock(inputPath, outputPath, password) {
    throw new Error("PDF handler not implemented");
  },
};
```

`src/handlers/office.ts`:
```typescript
import type { Handler } from "./types.js";

export const officeHandler: Handler = {
  extensions: [".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"],
  async unlock(inputPath, outputPath, password) {
    throw new Error("Office handler not implemented");
  },
};
```

`src/handlers/zip.ts`:
```typescript
import type { Handler } from "./types.js";

export const zipHandler: Handler = {
  extensions: [".zip"],
  async unlock(inputPath, outputPath, password) {
    throw new Error("ZIP handler not implemented");
  },
};
```

`src/handlers/rar.ts`:
```typescript
import type { Handler } from "./types.js";

export const rarHandler: Handler = {
  extensions: [".rar"],
  async unlock(inputPath, outputPath, password) {
    throw new Error("RAR handler not implemented");
  },
};
```

`src/handlers/sevenz.ts`:
```typescript
import type { Handler } from "./types.js";

export const sevenzHandler: Handler = {
  extensions: [".7z"],
  async unlock(inputPath, outputPath, password) {
    throw new Error("7z handler not implemented");
  },
};
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx tsx --test src/detector.test.ts`
Expected: PASS — all 8 tests

- [ ] **Step 6: Commit**

```bash
git add src/detector.ts src/detector.test.ts src/handlers/
git commit -m "feat: add file type detector and handler registry with stubs"
```

---

## Chunk 2: CLI Entry Point + Password Resolution

### Task 4: CLI with Commander + Password Resolution

**Files:**
- Create: `src/cli.ts`
- Create: `src/password.ts`
- Create: `src/password.test.ts`

- [ ] **Step 1: Write failing tests for password resolution**

Create `src/password.test.ts`:

```typescript
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { resolvePassword } from "./password.js";

describe("resolvePassword", () => {
  const originalEnv = process.env.UNLOCKIT_PASSWORD;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.UNLOCKIT_PASSWORD;
    } else {
      process.env.UNLOCKIT_PASSWORD = originalEnv;
    }
  });

  it("returns CLI flag value when provided", async () => {
    const pw = await resolvePassword("secret", false);
    assert.strictEqual(pw, "secret");
  });

  it("falls back to env var when no flag", async () => {
    process.env.UNLOCKIT_PASSWORD = "envpass";
    const pw = await resolvePassword(undefined, false);
    assert.strictEqual(pw, "envpass");
  });

  it("throws when no password and not a TTY", async () => {
    delete process.env.UNLOCKIT_PASSWORD;
    await assert.rejects(
      () => resolvePassword(undefined, false),
      { message: /No password provided/ }
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx tsx --test src/password.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement password resolution**

Create `src/password.ts`:

```typescript
export async function resolvePassword(
  flagValue: string | undefined,
  isTTY: boolean
): Promise<string> {
  if (flagValue) return flagValue;

  const envValue = process.env.UNLOCKIT_PASSWORD;
  if (envValue) return envValue;

  if (isTTY) {
    return promptPassword();
  }

  throw new Error("No password provided. Use -p, UNLOCKIT_PASSWORD env var, or run interactively.");
}

function promptPassword(): Promise<string> {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    process.stderr.write("Enter password: ");

    if (stdin.isTTY) {
      stdin.setRawMode(true);
    }

    let password = "";
    stdin.resume();
    stdin.setEncoding("utf8");

    const onData = (char: string) => {
      if (char === "\n" || char === "\r" || char === "\u0004") {
        if (stdin.isTTY) stdin.setRawMode(false);
        stdin.removeListener("data", onData);
        stdin.pause();
        process.stderr.write("\n");
        resolve(password);
      } else if (char === "\u0003") {
        // Ctrl+C
        if (stdin.isTTY) stdin.setRawMode(false);
        stdin.pause();
        reject(new Error("Cancelled"));
      } else if (char === "\u007F" || char === "\b") {
        // Backspace
        password = password.slice(0, -1);
      } else {
        password += char;
      }
    };

    stdin.on("data", onData);
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx tsx --test src/password.test.ts`
Expected: PASS — all 3 tests

- [ ] **Step 5: Implement CLI entry point**

Create `src/cli.ts`:

```typescript
import { Command } from "commander";
import path from "node:path";
import fs from "node:fs";
import { detectHandler } from "./detector.js";
import { resolvePassword } from "./password.js";
import { getOutputPath, log, logError } from "./utils.js";
import { getSupportedExtensions } from "./detector.js";

const program = new Command();

program
  .name("unlockit")
  .description("Remove passwords from protected files (PDF, Office, ZIP, RAR, 7z)")
  .version("1.0.0", "-V, --version")
  .argument("<input>", "File or directory to unlock")
  .option("-p, --password <password>", "Password for the protected file(s)")
  .option("-o, --output <dir>", "Output directory (default: same as source)")
  .option("-r, --recursive", "Scan subdirectories in batch mode")
  .option("-f, --force", "Overwrite existing output files")
  .option("-q, --quiet", "Suppress progress output, only print errors")
  .action(async (input: string, opts) => {
    try {
      const password = await resolvePassword(opts.password, process.stdin.isTTY ?? false);
      const inputPath = path.resolve(input);
      const stat = await fs.promises.stat(inputPath).catch(() => null);

      if (!stat) {
        logError(`Error: File not found: ${inputPath}`);
        process.exit(2);
      }

      if (stat.isDirectory()) {
        await processBatch(inputPath, password, opts);
      } else {
        const success = await processFile(inputPath, password, opts);
        process.exit(success ? 0 : 1);
      }
    } catch (err: any) {
      logError(`Error: ${err.message}`);
      process.exit(2);
    }
  });

async function processFile(
  filePath: string,
  password: string,
  opts: { output?: string; force?: boolean; quiet?: boolean }
): Promise<boolean> {
  const handler = detectHandler(filePath);
  if (!handler) {
    logError(`Error: Unsupported file format "${path.extname(filePath)}"`);
    return false;
  }

  const outputPath = getOutputPath(filePath, opts.output);

  if (!opts.force && fs.existsSync(outputPath)) {
    logError(`Skipped: ${path.basename(outputPath)} already exists (use --force to overwrite)`);
    return false;
  }

  if (opts.output) {
    await fs.promises.mkdir(opts.output, { recursive: true });
  }

  try {
    await handler.unlock(filePath, outputPath, password);
    log(`Unlocked: ${path.basename(filePath)} → ${path.basename(outputPath)}`, opts.quiet ?? false);
    return true;
  } catch (err: any) {
    logError(`Error: Failed to unlock ${path.basename(filePath)}: ${err.message}`);
    return false;
  }
}

async function processBatch(
  dirPath: string,
  password: string,
  opts: { output?: string; force?: boolean; quiet?: boolean; recursive?: boolean }
): Promise<void> {
  const supportedExts = getSupportedExtensions();
  const files = await collectFiles(dirPath, supportedExts, opts.recursive ?? false);

  if (files.length === 0) {
    logError("Error: No supported files found in directory.");
    process.exit(2);
  }

  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < files.length; i++) {
    log(`[${i + 1}/${files.length}] Unlocking ${path.basename(files[i])}...`, opts.quiet ?? false);
    const ok = await processFile(files[i], password, opts);
    if (ok) succeeded++;
    else failed++;
  }

  log(`\nDone. ${succeeded} unlocked, ${failed} failed.`, opts.quiet ?? false);
  process.exit(failed > 0 ? 1 : 0);
}

async function collectFiles(
  dir: string,
  supportedExts: string[],
  recursive: boolean
): Promise<string[]> {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  let files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (supportedExts.includes(ext)) {
        files.push(fullPath);
      }
    } else if (entry.isDirectory() && recursive) {
      const nested = await collectFiles(fullPath, supportedExts, recursive);
      files.push(...nested);
    }
  }

  return files;
}

program.parse();
```

- [ ] **Step 6: Build and verify CLI runs**

Run: `npm run build && node dist/cli.js --help`
Expected: Help text with all flags listed

- [ ] **Step 7: Commit**

```bash
git add src/cli.ts src/password.ts src/password.test.ts
git commit -m "feat: add CLI entry point with password resolution and batch mode"
```

---

## Chunk 3: Format Handlers

### Task 5: PDF Handler

**Files:**
- Modify: `src/handlers/pdf.ts`

- [ ] **Step 1: Implement PDF handler**

Replace `src/handlers/pdf.ts`:

```typescript
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
```

- [ ] **Step 2: Build to check compilation**

Run: `npm run build`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/handlers/pdf.ts
git commit -m "feat: implement PDF handler via node-qpdf2"
```

---

### Task 6: Office Handler

**Files:**
- Modify: `src/handlers/office.ts`

- [ ] **Step 1: Implement Office handler**

Replace `src/handlers/office.ts`:

```typescript
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
```

- [ ] **Step 2: Build to check compilation**

Run: `npm run build`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/handlers/office.ts
git commit -m "feat: implement Office handler via officecrypto-tool"
```

---

### Task 7: ZIP Handler

**Files:**
- Modify: `src/handlers/zip.ts`

- [ ] **Step 1: Implement ZIP handler**

Replace `src/handlers/zip.ts`:

```typescript
import type { Handler } from "./types.js";
import fs from "node:fs";
import path from "node:path";
import { Open } from "unzipper";
import archiver from "archiver";
import { createTempDir, removeTempDir } from "../utils.js";

export const zipHandler: Handler = {
  extensions: [".zip"],
  async unlock(inputPath, outputPath, password) {
    const tmpDir = await createTempDir();

    try {
      // Extract with password
      const directory = await Open.file(inputPath);
      await Promise.all(
        directory.files
          .filter((f) => f.type !== "Directory")
          .map(async (file) => {
            const filePath = path.join(tmpDir, file.path);
            await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
            const content = await file.buffer(password);
            await fs.promises.writeFile(filePath, content);
          })
      );

      // Re-archive without password
      await new Promise<void>((resolve, reject) => {
        const output = fs.createWriteStream(outputPath);
        const archive = archiver("zip", { zlib: { level: 9 } });

        output.on("close", resolve);
        archive.on("error", reject);

        archive.pipe(output);
        archive.directory(tmpDir, false);
        archive.finalize();
      });
    } finally {
      await removeTempDir(tmpDir);
    }
  },
};
```

- [ ] **Step 2: Build to check compilation**

Run: `npm run build`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/handlers/zip.ts
git commit -m "feat: implement ZIP handler via unzipper + archiver"
```

---

### Task 8: RAR Handler

**Files:**
- Modify: `src/handlers/rar.ts`

- [ ] **Step 1: Implement RAR handler**

Replace `src/handlers/rar.ts`:

```typescript
import type { Handler } from "./types.js";
import fs from "node:fs";
import path from "node:path";
import archiver from "archiver";
import { createTempDir, removeTempDir } from "../utils.js";

export const rarHandler: Handler = {
  extensions: [".rar"],
  async unlock(inputPath, outputPath, password) {
    const { createExtractorFromFile } = await import("node-unrar-js");
    const tmpDir = await createTempDir();

    try {
      const extractor = await createExtractorFromFile({
        filepath: inputPath,
        targetPath: tmpDir,
        password,
      });

      const extracted = extractor.extract();
      const files = [...extracted.files];

      if (files.length === 0) {
        throw new Error("No files extracted — possibly incorrect password");
      }

      // Re-archive as ZIP (RAR cannot be re-created)
      await new Promise<void>((resolve, reject) => {
        const output = fs.createWriteStream(outputPath);
        const archive = archiver("zip", { zlib: { level: 9 } });

        output.on("close", resolve);
        archive.on("error", reject);

        archive.pipe(output);
        archive.directory(tmpDir, false);
        archive.finalize();
      });
    } finally {
      await removeTempDir(tmpDir);
    }
  },
};
```

- [ ] **Step 2: Build to check compilation**

Run: `npm run build`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/handlers/rar.ts
git commit -m "feat: implement RAR handler via node-unrar-js (outputs ZIP)"
```

---

### Task 9: 7z Handler

**Files:**
- Modify: `src/handlers/sevenz.ts`

- [ ] **Step 1: Implement 7z handler**

Replace `src/handlers/sevenz.ts`:

```typescript
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
```

- [ ] **Step 2: Build to check compilation**

Run: `npm run build`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/handlers/sevenz.ts
git commit -m "feat: implement 7z handler via 7zip-min"
```

---

## Chunk 4: Integration Testing + Polish

### Task 10: End-to-End Smoke Test

**Files:**
- Create: `test/e2e.test.ts`

- [ ] **Step 1: Write an e2e test for the CLI**

Create `test/e2e.test.ts`:

```typescript
import { describe, it } from "node:test";
import assert from "node:assert";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const CLI = path.resolve("dist/cli.js");

describe("CLI e2e", () => {
  it("prints help text", () => {
    const output = execFileSync("node", [CLI, "--help"], { encoding: "utf8" });
    assert.ok(output.includes("Remove passwords from protected files"));
    assert.ok(output.includes("--password"));
    assert.ok(output.includes("--output"));
  });

  it("prints version", () => {
    const output = execFileSync("node", [CLI, "-V"], { encoding: "utf8" });
    assert.match(output.trim(), /^\d+\.\d+\.\d+$/);
  });

  it("exits with error for missing file", () => {
    assert.throws(
      () => execFileSync("node", [CLI, "nonexistent.pdf", "-p", "pass"], {
        encoding: "utf8",
        stdio: "pipe",
      }),
      (err: any) => err.status === 2
    );
  });

  it("exits with error for unsupported format", () => {
    const tmp = path.join("/tmp", "test-unlockit.png");
    fs.writeFileSync(tmp, "fake");
    try {
      assert.throws(
        () => execFileSync("node", [CLI, tmp, "-p", "pass"], {
          encoding: "utf8",
          stdio: "pipe",
        }),
        (err: any) => err.status === 1
      );
    } finally {
      fs.unlinkSync(tmp);
    }
  });
});
```

- [ ] **Step 2: Build and run e2e tests**

Run: `npm run build && npx tsx --test test/e2e.test.ts`
Expected: PASS — all 4 tests

- [ ] **Step 3: Add test scripts to package.json**

Add to `package.json` scripts:

```json
{
  "scripts": {
    "test": "npx tsx --test src/**/*.test.ts",
    "test:e2e": "npm run build && npx tsx --test test/**/*.test.ts",
    "test:all": "npm run test && npm run test:e2e"
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add test/e2e.test.ts package.json
git commit -m "test: add e2e smoke tests for CLI"
```

---

### Task 11: README + Final Polish

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create README**

Create `README.md`:

````markdown
# unlockit

Remove passwords from protected files. Supports PDF, Office (doc/docx/xls/xlsx/ppt/pptx), ZIP, RAR, and 7z.

## Usage

```bash
npx unlockit file.pdf -p mypassword
```

### Interactive password prompt

```bash
npx unlockit file.xlsx
# Enter password: ****
```

### Environment variable

```bash
UNLOCKIT_PASSWORD=mypass npx unlockit file.docx
```

### Batch mode

```bash
npx unlockit ./locked-files/ -p mypass
npx unlockit ./locked-files/ -p mypass -r  # recursive
```

### Custom output directory

```bash
npx unlockit file.pdf -p mypass -o ./unlocked/
```

## Output

Files are saved as `filename.unlocked.ext` in the same directory (or the directory specified by `-o`).

RAR files are extracted and re-archived as ZIP: `archive.rar` → `archive.unlocked.zip`.

## Options

| Flag | Short | Description |
|------|-------|-------------|
| `--password <pass>` | `-p` | Password |
| `--output <dir>` | `-o` | Output directory |
| `--recursive` | `-r` | Scan subdirectories |
| `--force` | `-f` | Overwrite existing files |
| `--quiet` | `-q` | Only print errors |

## Requirements

- Node.js >= 18
- `qpdf` for PDF files (`brew install qpdf` / `apt install qpdf`)

## License

MIT
````

- [ ] **Step 2: Create LICENSE**

Create `LICENSE` with MIT license text.

- [ ] **Step 3: Final build + test**

Run: `npm run test:all`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add README.md LICENSE
git commit -m "docs: add README and LICENSE"
```

- [ ] **Step 5: Verify npx works locally**

Run: `npm link && unlockit --help`
Expected: Help text prints correctly
