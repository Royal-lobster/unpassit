import { Command } from "commander";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { detectHandler } from "./detector.js";
import { resolvePassword } from "./password.js";
import { getOutputPath, log, logError } from "./utils.js";
import { getSupportedExtensions } from "./detector.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../package.json"), "utf8"));

const program = new Command();

program
  .name("unpassit")
  .description("Remove passwords from protected files (PDF, Office, ZIP, RAR, 7z)")
  .version(pkg.version, "-V, --version")
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
